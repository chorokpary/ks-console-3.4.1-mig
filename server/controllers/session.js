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

const isEmpty = require('lodash/isEmpty')
const jwtDecode = require('jwt-decode')
const omit = require('lodash/omit')
const base64_url_decode = require('jwt-decode/lib/base64_url_decode')
const { getServerConfig } = require('../libs/utils')

const { client: clientConfig } = getServerConfig()

const {
  login,
  loginThird,
  oAuthLogin,
  getNewToken,
  createUser,
} = require('../services/session')
const {
  isValidReferer,
  isAppsRoute,
  decryptPassword,
  safeParseJSON,
  safeBase64,
} = require('../libs/utils')

const { send_gateway_request } = require('../libs/request')

const handleLogin = async ctx => {
  const params = ctx.request.body

  let referer = ctx.cookies.get('referer')
  referer = referer ? decodeURIComponent(referer) : ''

  const error = {}
  let user = null

  if (isEmpty(params) || !params.username || !params.encrypt) {
    Object.assign(error, {
      status: 400,
      reason: 'Invalid Login Params',
      message: 'invalid login params',
    })
  }

  if (isEmpty(error)) {
    try {
      const encryptKey = clientConfig.encryptKey || 'kubesphere'
      params.password = decryptPassword(params.encrypt, encryptKey)

      user = await login(params, { 'x-client-ip': ctx.request.ip })

      if (!user) {
        Object.assign(error, {
          status: 401,
          reason: 'Unauthorized',
          message: 'INCORRECT_USERNAME_OR_PASSWORD',
        })
      }
    } catch (err) {
      ctx.app.emit('error', err)

      switch (err.code) {
        case 400:
        case 401:
          Object.assign(error, {
            status: err.code,
            reason: 'Unauthorized',
            message: 'INCORRECT_USERNAME_OR_PASSWORD',
          })
          break
        case 429:
          Object.assign(error, {
            status: err.code,
            reason: 'Too Many Failures',
            message: 'TOO_MANY_FAILURES',
          })
          break
        case 502:
          Object.assign(error, {
            status: err.code,
            reason: 'Bad Gateway',
            message: 'FAILED_TO_ACCESS_BACKEND',
          })
          break
        case 'ETIMEDOUT':
          Object.assign(error, {
            status: 500,
            reason: 'Internal Server Error',
            message: 'FAILED_TO_ACCESS_API_SERVER',
          })
          break
        default:
          Object.assign(error, {
            status: 500,
            reason: err.statusText,
            message: err.message,
          })
      }
    }
  }

  if (!isEmpty(error) || !user) {
    ctx.body = error
    return
  }

  const lastToken = ctx.cookies.get('token')

  ctx.cookies.set('token', user.token)
  ctx.cookies.set('expire', user.expire)
  ctx.cookies.set('refreshToken', user.refreshToken)
  ctx.cookies.set('referer', null)

  if (user.username === 'system:pre-registration') {
    const extraname = safeBase64.safeBtoa(user.extraname)
    ctx.cookies.set('defaultUser', extraname)
    ctx.cookies.set('defaultEmail', user.email)
    return ctx.redirect('/login/confirm')
  }

  if (!user.initialized) {
    return ctx.redirect('/password/confirm')
  }

  if (lastToken) {
    const { username } = jwtDecode(lastToken)
    if (username && username !== user.username) {
      return ctx.redirect('/')
    }
  }

  ctx.redirect(isValidReferer(referer) ? referer : '/')
}

const handleThirdLogin = async ctx => {
  const params = ctx.request.body

  let referer = ctx.cookies.get('referer')
  referer = referer ? decodeURIComponent(referer) : ''

  const error = {}
  let user = null

  if (!params.username || !params.password) {
    Object.assign(error, {
      status: 400,
      reason: 'Invalid Login Params',
      message: 'invalid login params',
    })
  }

  if (isEmpty(error)) {
    try {
      user = await loginThird(params, { 'x-client-ip': ctx.request.ip })

      if (!user) {
        Object.assign(error, {
          status: 401,
          reason: 'Unauthorized',
          message: 'INCORRECT_USERNAME_OR_PASSWORD',
        })
      }
    } catch (err) {
      ctx.app.emit('error', err)

      switch (err.code) {
        case 400:
        case 401:
          Object.assign(error, {
            status: err.code,
            reason: 'Unauthorized',
            message: 'INCORRECT_USERNAME_OR_PASSWORD',
          })
          break
        case 429:
          Object.assign(error, {
            status: err.code,
            reason: 'Too Many Failures',
            message: 'TOO_MANY_FAILURES',
          })
          break
        case 502:
          Object.assign(error, {
            status: err.code,
            reason: 'Bad Gateway',
            message: 'FAILED_TO_ACCESS_BACKEND',
          })
          break
        case 'ETIMEDOUT':
          Object.assign(error, {
            status: 500,
            reason: 'Internal Server Error',
            message: 'FAILED_TO_ACCESS_API_SERVER',
          })
          break
        default:
          Object.assign(error, {
            status: 500,
            reason: err.statusText,
            message: err.message,
          })
      }
    }
  }

  if (!isEmpty(error) || !user) {
    ctx.body = error
    return
  }

  const lastToken = ctx.cookies.get('token')

  ctx.cookies.set('token', user.token)
  ctx.cookies.set('expire', user.expire)
  ctx.cookies.set('refreshToken', user.refreshToken)
  ctx.cookies.set('referer', null)

  if (user.username === 'system:pre-registration') {
    const extraname = safeBase64.safeBtoa(user.extraname)
    ctx.cookies.set('defaultUser', extraname)
    ctx.cookies.set('defaultEmail', user.email)
    return ctx.redirect('/login/confirm')
  }

  if (!user.initialized) {
    return ctx.redirect('/password/confirm')
  }

  if (lastToken) {
    const { username } = jwtDecode(lastToken)
    if (username && username !== user.username) {
      return ctx.redirect('/')
    }
  }

  ctx.redirect(isValidReferer(referer) ? referer : '/')
}

const handleLogout = async ctx => {
  const oAuthLoginInfo = safeParseJSON(
    decodeURIComponent(ctx.cookies.get('oAuthLoginInfo'))
  )

  const token = ctx.cookies.get('token')

  ctx.cookies.set('token', null)
  ctx.cookies.set('expire', null)
  ctx.cookies.set('refreshToken', null)
  ctx.cookies.set('oAuthLoginInfo', null)

  if (
    !isEmpty(oAuthLoginInfo) &&
    oAuthLoginInfo.type &&
    oAuthLoginInfo.type === 'OIDCIdentityProvider' &&
    oAuthLoginInfo.endSessionURL
  ) {
    const url = `${oAuthLoginInfo.endSessionURL}`
    ctx.body = { data: { url }, success: true }
  } else {
    const { origin = '', referer = '' } = ctx.headers
    const refererPath = referer.replace(origin, '')

    await send_gateway_request({
      method: 'GET',
      url: '/oauth/logout',
      token,
    })

    if (isAppsRoute(refererPath)) {
      ctx.redirect(refererPath)
    } else {
      ctx.redirect('/login')
    }
  }
}

const handleOAuthLogin = async ctx => {
  let user = null
  const error = {}
  const oauthParams = omit(ctx.query, ['redirect_url', 'state'])
  let referer = ctx.cookies.get('referer')
  referer = referer ? decodeURIComponent(referer) : ''

  try {
    user = await oAuthLogin({ ...oauthParams, oauthName: ctx.params.name })
  } catch (err) {
    /* eslint-disable no-console */
    console.log(err)

    ctx.app.emit('error', err)
    Object.assign(error, {
      status: err.code,
      reason: err.statusText,
      message: err.message,
    })
  }

  if (!isEmpty(error) || !user) {
    ctx.body = error
    return
  }

  ctx.cookies.set('token', user.token)
  ctx.cookies.set('expire', user.expire)
  ctx.cookies.set('refreshToken', user.refreshToken)
  ctx.cookies.set('referer', null)

  if (user.username === 'system:pre-registration') {
    const extraname = safeBase64.safeBtoa(user.extraname)
    ctx.cookies.set('defaultUser', extraname)
    ctx.cookies.set('defaultEmail', user.email)
    return ctx.redirect('/login/confirm')
  }

  const state = ctx.query.state
  const redirect_url = ctx.query.redirect_url

  if (state) {
    try {
      const state_object = JSON.parse(base64_url_decode(state))
      const state_url = state_object.redirect_url
      if (state_url) {
        ctx.redirect(state_url)
      }
    } catch (err) {
      /* eslint-disable no-console */
      console.log(err)
    }
  }

  if (redirect_url) {
    const redirectHost = new URL(redirect_url).host
    if (redirectHost === ctx.headers.host) {
      ctx.redirect(redirect_url)
    }
  } else {
    ctx.redirect(isValidReferer(referer) ? referer : '/')
  }
}

const handleLoginConfirm = async ctx => {
  const token = ctx.cookies.get('token')
  const params = ctx.request.body

  await createUser(params, token)

  const data = await getNewToken(ctx)
  if (data.token) {
    ctx.cookies.set('token', data.token)
    ctx.cookies.set('expire', data.expire)
    ctx.cookies.set('refreshToken', data.refreshToken)

    ctx.cookies.set('defaultUser', null)
    ctx.cookies.set('defaultEmail', null)
    ctx.redirect('/')
  }
}

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
      console.log(`[Scheduler] Found ${response.items.length} GPU nodes`)

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
    } else {
      console.log('[Scheduler] No GPU nodes found')
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

  console.log(`[Scheduler] ===== GPU Node ${index + 1}: ${nodeName} =====`)
  console.log(
    `[Scheduler]   nvidia.com/gpu.present: ${labels['nvidia.com/gpu.present'] ||
      'N/A'}`
  )
  console.log(
    `[Scheduler]   nvidia.com/gpu.product: ${labels['nvidia.com/gpu.product'] ||
      'N/A'}`
  )
  console.log(
    `[Scheduler]   nvidia.com/gpu.count: ${labels['nvidia.com/gpu.count'] ||
      'N/A'}`
  )
  console.log(
    `[Scheduler]   nvidia.com/gpu.replicas: ${labels[
      'nvidia.com/gpu.replicas'
    ] || 'N/A'}`
  )
  console.log(
    `[Scheduler]   nvidia.com/mig.config: ${labels['nvidia.com/mig.config'] ||
      'N/A'}`
  )
  console.log(
    `[Scheduler]   nvidia.com/mig.config.state: ${labels[
      'nvidia.com/mig.config.state'
    ] || 'N/A'}`
  )
  console.log(
    `[Scheduler]   nvidia.com/mig.strategy: ${labels[
      'nvidia.com/mig.strategy'
    ] || 'N/A'}`
  )
  console.log(
    `[Scheduler]   petasus.io/gpu.origin.catalog: ${annotations[
      'petasus.io/gpu.origin.catalog'
    ] || 'N/A'}`
  )

  // petasus.io/gpu.origin.catalog annotation이 있으면 파싱해서 반환
  if (annotations['petasus.io/gpu.origin.catalog']) {
    try {
      const catalogData = JSON.parse(
        annotations['petasus.io/gpu.origin.catalog']
      )
      console.log(
        `[Scheduler]   ✅ Found existing GPU catalog annotation for ${nodeName}`
      )

      // 배열이든 객체든 그대로 반환
      if (catalogData !== null && catalogData !== undefined) {
        return catalogData
      }
    } catch (parseError) {
      console.error(
        `[Scheduler]   ⚠️  Failed to parse GPU catalog annotation for ${nodeName}:`,
        parseError.message
      )
    }
  }

  // feature.node.kubernetes.io/device-xxxx_xxxx.present 패턴 찾기
  // const devicePattern = /^feature\.node\.kubernetes\.io\/device-([0-9a-f]{4})_([0-9a-f]{4})\.present$/
  // const deviceLabels = Object.keys(labels).filter(key =>
  //   devicePattern.test(key)
  // )
  
  const devicePattern = /^feature\.node\.kubernetes\.io\/pci-([0-9a-f]{4})_([0-9a-f]{4})\.present$/
  const deviceLabels = Object.keys(labels).filter(key => devicePattern.test(key) && labels[key] === 'true')

  if (deviceLabels.length > 0) {
    console.log(`[Scheduler]   Device feature labels:`)
    deviceLabels.forEach(labelKey => {
      const match = labelKey.match(devicePattern)
      if (match) {
        console.log(
          `[Scheduler]     ${labelKey}: ${labels[labelKey]} (vendor: ${match[1]}, device: ${match[2]})`
        )
      }
    })
  }

  // petasus.io annotation이 없으면 새로 생성
  if (!annotations['petasus.io/gpu.origin.catalog']) {
    console.log(
      `[Scheduler] ⚠️  WARNING: Node ${nodeName} has nvidia.com/gpu.present=true but missing petasus.io annotation!`
    )
    console.log(
      `[Scheduler]   petasus.io/gpu.origin.catalog: ${annotations[
        'petasus.io/gpu.origin.catalog'
      ] || 'MISSING'}`
    )

    // device feature labels에서 deviceId 추출
    const deviceIds = extractDeviceIds(labels, devicePattern)

    if (deviceIds.length > 0) {
      console.log(
        `[Scheduler]   Collected ${
          deviceIds.length
        } device IDs: ${deviceIds.join(', ')}`
      )

      // ConfigMap에서 MIG 설정 조회
      const catalogInfo = await fetchMigConfigs(
        deviceIds,
        nodeName,
        labels,
        token
      )
      return catalogInfo
    }
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
        console.log(
          `[Scheduler]     Found device_id: "${deviceId}" from ${labelKey}`
        )
      }
    }
  })

  return deviceIds
}

// MIG 설정 조회
async function fetchMigConfigs(deviceIds, nodeName, labels, token) {
  try {
    const configMapUrl =
      '/api/v1/namespaces/nvidia/configmaps/custom-mig-config-templates'
    console.log(`[Scheduler]   Fetching MIG config from ConfigMap...`)

    const configMapResponse = await send_gateway_request({
      method: 'GET',
      url: configMapUrl,
      token,
    })

    if (
      configMapResponse &&
      configMapResponse.data &&
      configMapResponse.data['mig-config-templates.yaml']
    ) {
      const yaml = require('js-yaml')
      const migConfigs = yaml.load(
        configMapResponse.data['mig-config-templates.yaml']
      )

      if (migConfigs && migConfigs['mig-config-templates']) {
        console.log(
          `[Scheduler]   Found ${migConfigs['mig-config-templates'].length} MIG config templates`
        )

        const matchedConfigs = []

        // deviceIds와 매칭되는 설정 찾기
        deviceIds.forEach(deviceId => {
          const matchedConfig = migConfigs['mig-config-templates'].find(
            template =>
              template.device_id &&
              template.device_id.toLowerCase() === deviceId.toLowerCase()
          )

          if (matchedConfig) {
            console.log(
              `[Scheduler]   ✅ Found MIG config for device_id: "${deviceId}"`
            )
            console.log(`[Scheduler]     - Name: ${matchedConfig.name}`)
            console.log(`[Scheduler]     - Alias: ${matchedConfig.alias}`)
            console.log(
              `[Scheduler]     - Architecture: ${matchedConfig.architecture}`
            )
            console.log(
              `[Scheduler]     - Memory: ${matchedConfig.memory_size}`
            )
            console.log(
              `[Scheduler]     - Max Instances: ${matchedConfig.max_instance_num}`
            )
            console.log(
              `[Scheduler]     - Available configs: ${matchedConfig.configs.length}`
            )
            console.log(
              `[Scheduler]     - device_id: ${matchedConfig.device_id}`
            )

            matchedConfigs.push(matchedConfig)
          } else {
            console.log(
              `[Scheduler]   ⚠️  No MIG config found for device_id: "${deviceId}"`
            )
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
          await updateNodeAnnotation(nodeName, matchedConfigs, labels, token)

          // 하나만 있으면 객체로, 여러 개면 배열로 반환
          return catalogObjects.length === 1
            ? catalogObjects[0]
            : catalogObjects
        }
      }
    } else {
      console.log(`[Scheduler]   ConfigMap data not found or invalid format`)
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
async function updateNodeAnnotation(nodeName, matchedConfigs, labels, token) {
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

    // JSON 배열로 변환 (예쁘게 포맷팅)
    const catalogValue = JSON.stringify(catalogObjects, null, 2)

    console.log(
      `[Scheduler]   Preparing to update node annotation for ${nodeName}`
    )
    console.log(`[Scheduler]   petasus.io/gpu.origin.catalog:\n${catalogValue}`)

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

    if (patchResponse) {
      console.log(
        `[Scheduler]   ✅ Successfully updated node annotation for ${nodeName}`
      )
    }
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
  handleLogin,
  handleThirdLogin,
  handleLogout,
  handleOAuthLogin,
  handleLoginConfirm,

  handlePostGpuCatalog,
  handleGetGpuCatalog,
}
