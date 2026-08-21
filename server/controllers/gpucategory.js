/*
 * This file is part of KubeSphere Console.
 * Copyright (C) 2019 The KubeSphere Console Authors.
 *
 * KubeSphere Console is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * KubeSphere Console is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with KubeSphere Console.  If not, see <https://www.gnu.org/licenses/>.
 */

const { getServerConfig } = require('../libs/utils')
const { client: clientConfig } = getServerConfig()
const { send_gateway_request } = require('../libs/request')

const handlePostGpuCatalog = async ctx => {
  const token = ctx.cookies.get('token')
  const params = ctx.request.body
  const labelSelector = 'nvidia.com/gpu.present=true'
  const url = `/kapis/resources.kubesphere.io/v1alpha3/nodes?labelSelector=${encodeURIComponent(
    labelSelector
  )}`

  try {
    const response = await send_gateway_request({
      method: 'GET',
      url,
      token,
    })

    const gpuCatalogs = []

    if (response && response.items) {
      // 노드 정보 처리 및 결과 수집
      for (let index = 0; index < response.items.length; index++) {
        const catalogInfo = await processGpuNode(
          response.items[index],
          index,
          token
        )
        if (catalogInfo) {
          // 배열이면 펼쳐서 추가, 아니면 그대로 추가
          if (Array.isArray(catalogInfo)) {
            gpuCatalogs.push(...catalogInfo)
          } else {
            gpuCatalogs.push(catalogInfo)
          }
        }
      }
    }

    ctx.body = gpuCatalogs
  } catch (err) {
    ctx.app.emit('error', err)
    ctx.status = err.code || 500
    ctx.body = {
      status: err.code || 500,
      reason: err.statusText || 'Internal Server Error',
      message: err.message || 'An unexpected error occurred',
    }
  }
}

async function processGpuNode(node, index, token) {
  const nodeName = (node.metadata && node.metadata.name) || 'unknown'
  const labels = (node.metadata && node.metadata.labels) || {}
  const annotations = (node.metadata && node.metadata.annotations) || {}
  const existingAnnotation = annotations['petasus.io/gpu.origin.catalog']

  // petasus.io/gpu.origin.catalog annotation이 이미 존재하면 파싱하여 반환
  if (existingAnnotation) {
    try {
      const catalogData = JSON.parse(existingAnnotation)
      if (catalogData !== null && catalogData !== undefined) {
        return catalogData
      }
    } catch (parseError) {
      console.error(
        `[Scheduler] Failed to parse GPU catalog annotation for ${nodeName}:`,
        parseError.message
      )
    }
  }

  const devicePattern = /^feature\.node\.kubernetes\.io\/pci-([0-9a-f]{4})_([0-9a-f]{4})\.present$/
  const deviceIds = extractDeviceIds(labels, devicePattern)

  if (deviceIds.length > 0) {
    // existingAnnotation 매개변수 추가 전달
    const catalogInfo = await fetchMigConfigs(
      deviceIds,
      nodeName,
      labels,
      token,
      existingAnnotation
    )
    return catalogInfo
  }

  return null
}

// deviceId 추출
function extractDeviceIds(labels, devicePattern) {
  const deviceIds = []

  Object.keys(labels).forEach(labelKey => {
    if (devicePattern.test(labelKey)) {
      const match = labelKey.match(devicePattern)
      if (match) {
        const vendor = match[1].toLowerCase()
        const device = match[2].toLowerCase()
        const deviceId = `0x${device.toUpperCase()}${vendor.toUpperCase()}`
        deviceIds.push(deviceId)
      }
    }
  })

  return deviceIds
}

// MIG 설정 조회
async function fetchMigConfigs(deviceIds, nodeName, labels, token, existingAnnotation) {
  try {
    const gpuOperatorConfig = clientConfig.gpuOperator || {}
    const namespace = gpuOperatorConfig.namespace || 'nvidia-system'
    const configMapName = gpuOperatorConfig.migConfigTemplates || 'custom-mig-config-templates'

    const configMapUrl = `/api/v1/namespaces/${namespace}/configmaps/${configMapName}`

    const configMapResponse = await send_gateway_request({
      method: 'GET',
      url: configMapUrl,
      token,
    })

    if (
      configMapResponse &&
      configMapResponse.data &&
      (configMapResponse.data['config.yaml'] ||
        configMapResponse.data['mig-config-templates.yaml'])
    ) {
      const yaml = require('js-yaml')
      const yamlContent =
        configMapResponse.data['config.yaml'] ||
        configMapResponse.data['mig-config-templates.yaml']
      const migConfigs = yaml.load(yamlContent)

      if (migConfigs && migConfigs['mig-config-templates']) {
        const matchedConfigs = []

        // deviceIds와 매칭되는 설정 찾기
        deviceIds.forEach(deviceId => {
          const matchedConfig = migConfigs['mig-config-templates'].find(
            template =>
              template.device_id &&
              template.device_id.toLowerCase() === deviceId.toLowerCase()
          )

          if (matchedConfig) {
            matchedConfigs.push(matchedConfig)
          }
        })

        // 매칭된 설정이 있으면 catalog 정보 배열 반환
        if (matchedConfigs.length > 0) {
          const catalogObjects = matchedConfigs.map(config => {
            return {
              name: config.name,
              alias: config.alias,
              count: parseInt(labels['nvidia.com/gpu.count']) || 0,
              deviceID: config.device_id,
              nodeName,
            }
          })

          // 노드 annotation 업데이트
          await updateNodeAnnotation(nodeName, matchedConfigs, labels, token, existingAnnotation)

          // 하나만 있으면 객체로, 여러 개면 배열로 반환
          return catalogObjects.length === 1
            ? catalogObjects[0]
            : catalogObjects
        }
      }
    }
  } catch (configError) {
    console.error(
      `[Scheduler]   Failed to fetch MIG config:`,
      configError.message
    )
  }

  return null
}

// 노드 annotation 업데이트
async function updateNodeAnnotation(
  nodeName,
  matchedConfigs,
  labels,
  token,
  existingAnnotation
) {
  try {
    // petasus.io/gpu.origin.catalog annotation 값 구성 (JSON 배열)
    const catalogObjects = matchedConfigs.map(config => {
      return {
        name: config.name,
        alias: config.alias,
        count: parseInt(labels['nvidia.com/gpu.count']) || 0,
        deviceID: config.device_id,
        nodeName,
      }
    })

    // JSON 배열로 변환
    const catalogValue = JSON.stringify(catalogObjects, null, 2)

    // 기존 annotation과 내용이 동일하면 PATCH 요청 생략
    if (existingAnnotation) {
      try {
        const existingParsed = JSON.parse(existingAnnotation)
        const newParsed = JSON.parse(catalogValue)
        if (JSON.stringify(existingParsed) === JSON.stringify(newParsed)) {
          return
        }
      } catch (e) {
        if (existingAnnotation.trim() === catalogValue.trim()) {
          return
        }
      }
    }

    // 노드 패치 요청
    const patchUrl = `/api/v1/nodes/${nodeName}`
    const patchData = {
      metadata: {
        annotations: {
          'petasus.io/gpu.origin.catalog': catalogValue,
        },
      },
    }

    const patchResponse = await send_gateway_request({
      method: 'PATCH',
      url: patchUrl,
      params: patchData,
      token,
      headers: {
        'content-type': 'application/strategic-merge-patch+json',
      },
    })
  } catch (patchError) {
    console.error(
      `[Scheduler]   Failed to update node annotation for ${nodeName}:`,
      patchError.message
    )
  }
}

const handleGetGpuCatalog = async ctx => {
  const token = ctx.cookies.get('token')
  const node = ctx.params.node
  const labelSelector = 'nvidia.com/gpu.present=true'

  try {
    // node 정보가 없으면 모든 GPU 노드의 catalog 수집
    if (!node || node === 'all') {
      const url = `/kapis/resources.kubesphere.io/v1alpha3/nodes?labelSelector=${encodeURIComponent(
        labelSelector
      )}`
      const response = await send_gateway_request({
        method: 'GET',
        url,
        token,
      })

      const allCatalogs = []

      if (response && response.items) {
        for (const item of response.items) {
          const annotations = (item.metadata && item.metadata.annotations) || {}
          if (annotations['petasus.io/gpu.origin.catalog']) {
            try {
              const catalogData = JSON.parse(
                annotations['petasus.io/gpu.origin.catalog']
              )
              // 배열이면 펼쳐서 추가, 아니면 그대로 추가
              if (Array.isArray(catalogData)) {
                allCatalogs.push(...catalogData)
              } else {
                allCatalogs.push(catalogData)
              }
            } catch (parseError) {
              console.error(
                `[handleGetGpuCatalog] Failed to parse catalog for ${item.metadata.name}:`,
                parseError.message
              )
            }
          }
        }
      }

      ctx.body = allCatalogs
    } else {
      // 특정 노드의 catalog 조회
      const nodeUrl = `/api/v1/nodes/${node}`
      const response = await send_gateway_request({
        method: 'GET',
        url: nodeUrl,
        token,
      })

      const annotations =
        (response.metadata && response.metadata.annotations) || {}

      if (annotations['petasus.io/gpu.origin.catalog']) {
        try {
          const catalogData = JSON.parse(
            annotations['petasus.io/gpu.origin.catalog']
          )
          ctx.body = catalogData
        } catch (parseError) {
          console.error(
            `[handleGetGpuCatalog] Failed to parse catalog for ${node}:`,
            parseError.message
          )
          ctx.body = []
        }
      } else {
        ctx.body = []
      }
    }
  } catch (err) {
    ctx.app.emit('error', err)
    ctx.status = err.code || 500
    ctx.body = {
      status: err.code || 500,
      reason: err.statusText || 'Internal Server Error',
      message: err.message || 'An unexpected error occurred',
    }
  }
}

module.exports = {
  handlePostGpuCatalog,
  handleGetGpuCatalog,
}
