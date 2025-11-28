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

import { get, set, uniq, isArray, intersection } from 'lodash'
import { observable, action } from 'mobx'
import { Notify } from '@kube-design/components'
import { LIST_DEFAULT_ORDER } from 'utils/constants'
import ObjectMapper from 'utils/object.mapper'
import cookie from 'utils/cookie'

import yaml from 'js-yaml'
import Base from '../base'
import List from '../base.list'

export default class GpuMigProfilesStore extends Base {
  records = new List()

  module = 'gpumigprofiles'

  moduel_configMap = 'configmaps'

  getListUrl = (params = {}) =>
    `api/v1/${this.getPath(params)}/${this.moduel_configMap}`

  getDetailUrl = (params = {}) => `${this.getListUrl(params)}/${params.name}`

  @action
  async fetchList({
    cluster,
    workspace,
    namespace,
    infinite,
    more,
    devops,
    silent,
    ...params
  } = {}) {
    if (!silent) {
      this.list.isLoading = true
    }

    if (!params.sortBy && params.ascending === undefined) {
      params.sortBy = LIST_DEFAULT_ORDER[this.module] || 'name'
    }

    if (infinite) {
      params.limit = -1
    }

    if (params.limit === Infinity || params.limit === -1) {
      params.limit = -1
      params.page = 1
    }

    params.page = params.page || 1
    params.limit = params.limit || 10

    const page = params.page
    const limit = params.limit

    if (namespace) {
      params.project = namespace
    }

    // 전체 변환 데이터
    const result = await this.getAllListData()
    const data = get(result, 'data')

    // 초기 정렬 처리
    data.sort((a, b) => {
      return a.name < b.name ? 1 : a.name > b.name ? -1 : 0
    })

    // 초기 데이터 처리
    this.dataList = data

    // namespace(project) 있는 경우
    if (namespace) {
      params.project = namespace
    }

    // 검색 관련 처리
    const exceptionArray = ['page', 'limit', 'sortBy', 'ascending', 'project']
    const searchArray = Object.keys(params)
      .map(key => {
        const value = params[key]
        const searchData = {
          searchKeywordType: key,
          searchKeywordText: value,
        }
        return searchData
      })
      .filter(row => exceptionArray.includes(row.searchKeywordType) === false)

    if (searchArray.length > 0) {
      searchArray.map(search => {
        const resultList = this.dataList.filter(row => {
          if (search.searchKeywordType === 'state') {
            return (
              row[search.searchKeywordType]?.toLowerCase() ===
              search.searchKeywordText.toLowerCase()
            )
          }
          return row[search.searchKeywordType]
            ?.toLowerCase()
            .includes(search.searchKeywordText.toLowerCase())
        })
        this.dataList = resultList
      })
    }

    // 전체 데이터 갯수
    const total = this.dataList.length || 0

    // 정렬 처리
    const sortType = params.ascending ? 'asc' : 'desc'
    this.dataList.sort((a, b) => {
      const x = a[params.sortBy]
      const y = b[params.sortBy]
      if (sortType === 'desc') {
        return x > y ? -1 : x < y ? 1 : 0
      }
      return x < y ? -1 : x > y ? 1 : 0
    })

    // mm3 데이터 page 별 Slice 처리
    const perPage = Number(params.limit) || 10
    const currentPage = Number(params.page) || 1
    const mm3SliceData = this.dataList.slice(
      (currentPage - 1) * perPage,
      currentPage * perPage
    )

    this.list.update({
      data: more ? [...this.list.data, ...mm3SliceData] : mm3SliceData,
      total,
      ...params,
      limit: Number(params.limit) || 10,
      page: Number(params.page) || 1,
      isLoading: false,
      ...(this.list.silent ? {} : { selectedRowKeys: [] }),
    })
    console.log(`this.dataList : ${JSON.stringify(this.dataList)}`)
    return this.dataList
  }

  @action
  async create(data, params = {}) {
    const name = `petasus-${data.name}`

    const configMapParams = {
      namespace: 'nvidia',
      name: 'default-mig-parted-config',
    }

    // 원본 데이터 가져오기
    const resultConfigMap = await request.get(
      this.getDetailUrl(configMapParams)
    )

    // config.yaml 추출
    const yamlString = get(resultConfigMap, ['data', 'config.yaml'])
    const yamlText = yamlString

    // object로 변환
    const parsed = yaml.load(yamlText)
    const migConfigs = parsed['mig-configs']

    // 값 추가
    migConfigs[name] = await this.convertToMigConfigPerDevice(data)

    // 수정된 mig-configs 다시 적용
    parsed['mig-configs'] = migConfigs

    // object → YAML 문자열로 변환
    const newYamlText = yaml.dump(parsed)

    // ConfigMap 구조에 다시 넣기
    resultConfigMap.data['config.yaml'] = newYamlText

    try {
      // await this.submitting(new Promise(resolve => setTimeout(resolve, 5000)))
      // return { success: true }

      const res = await this.submitting(
        request.put(this.getDetailUrl(configMapParams), resultConfigMap)
      )
      return res
    } catch (err) {
      return { success: false }
    }
  }

  @action
  async update(data, params = {}) {
    console.log(`update data : ${JSON.stringify(data)}`)
    const name = `petasus-${data.name}`

    const configMapParams = {
      namespace: 'nvidia',
      name: 'default-mig-parted-config',
    }

    // 원본 데이터 가져오기
    const resultConfigMap = await request.get(
      this.getDetailUrl(configMapParams)
    )

    // config.yaml 추출
    const yamlString = get(resultConfigMap, ['data', 'config.yaml'])
    const yamlText = yamlString

    // object로 변환
    const parsed = yaml.load(yamlText)
    const migConfigs = parsed['mig-configs']

    // 기존 데이터 삭제 처리
    delete migConfigs[name]

    // 수정 데이터 추가
    migConfigs[name] = await this.convertToMigConfigPerDevice(data)

    // 수정된 mig-configs 다시 적용
    parsed['mig-configs'] = migConfigs

    // object → YAML 문자열로 변환
    const newYamlText = yaml.dump(parsed)

    // ConfigMap 구조에 다시 넣기
    resultConfigMap.data['config.yaml'] = newYamlText

    try {
      const res = await this.submitting(
        request.put(this.getDetailUrl(configMapParams), resultConfigMap)
      )
      return res
    } catch (err) {
      return { success: false }
    }
  }

  @action
  async fetchDetail({ ...params }) {
    this.isLoading = true

    const resultList = await this.getAllListData()
    const result = resultList.data.filter(item => item.name === params.name)[0]
    const detail = { ...params, result, kind: 'data' }

    this.detail = detail
    this.isLoading = false
    return detail
  }

  @action
  async batchDelete({ ...params }) {
    return await this.submitting(
      Promise.all(
        params.retypeList.map(async id => {
          const namespace = params.namespace
          const url = `${this.getResourceUrl(params)}/${id}${
            namespace === 'default' ? '' : `?project=${namespace}`
          }`
          request.delete(url)
        })
      )
    )
  }

  @action
  async delete(params) {
    console.log(`params : ${JSON.stringify(params)}`)
    const name = params.name

    const configMapParams = {
      namespace: 'nvidia',
      name: 'default-mig-parted-config',
    }

    // 원본 데이터 가져오기
    const resultConfigMap = await request.get(
      this.getDetailUrl(configMapParams)
    )

    // config.yaml 추출
    const yamlString = get(resultConfigMap, ['data', 'config.yaml'])
    const yamlText = yamlString

    // object로 변환
    const parsed = yaml.load(yamlText)
    const migConfigs = parsed['mig-configs']

    // 삭제 처리
    delete migConfigs[name]

    // 수정된 mig-configs 다시 적용
    parsed['mig-configs'] = migConfigs

    // object → YAML 문자열로 변환
    const newYamlText = yaml.dump(parsed)

    // ConfigMap 구조에 다시 넣기
    resultConfigMap.data['config.yaml'] = newYamlText

    try {
      // await this.submitting(new Promise(resolve => setTimeout(resolve, 5000)))
      // return { success: true }
      const res = await this.submitting(
        request.put(this.getDetailUrl(configMapParams), resultConfigMap)
      )
      return res
    } catch (err) {
      return { success: false }
    }
  }

  async getMigConfigTemplate(params) {
    const configMapParams = {
      namespace: 'nvidia',
      name: 'custom-mig-config-templates',
    }
    // /api/v1/namespaces/nvidia/configmaps/custom-mig-config-templates
    const resultConfigMap = await request.get(
      this.getDetailUrl(configMapParams)
    )

    const yamlString = get(resultConfigMap, [
      'data',
      'mig-config-templates.yaml',
    ])
    const yamlText = yamlString

    const parsed = yaml.load(yamlText)
    const migConfigTemplates = parsed['mig-config-templates']

    const result = migConfigTemplates
      .filter(item => {
        if (params.type === 'N') {
          return item.name === params.name
        }
        return item.device_id === params.deviceId
      })
      .map(item => ({
        name: item.name,
        alias: item.alias,
        count: item.max_instance_num,
        memory: item.memory_size,
      }))[0]

    return result
  }

  async getMigLayout(params) {
    const configMapParams = {
      namespace: 'nvidia',
      name: 'mig-layouts',
    }

    const resultConfigMap = await request.get(
      this.getDetailUrl(configMapParams)
    )

    const yamlString = get(resultConfigMap, ['data', 'mig-layouts.yaml'])
    const yamlText = yamlString

    const parsed = yaml.load(yamlText)
    const migLayout = parsed['mig-layouts']

    const result = migLayout
      .filter(item => item.models.includes(params.name))
      .map(item => item['mig-profiles'])[0]

    return result
  }

  async getAllListData() {
    const configMapParams = {
      namespace: 'nvidia',
      name: 'default-mig-parted-config',
    }

    const resultConfigMap = await request.get(
      this.getDetailUrl(configMapParams)
    )

    const yamlString = get(resultConfigMap, ['data', 'config.yaml'])
    const yamlText = yamlString

    const parsed = yaml.load(yamlText)
    const migConfigs = parsed['mig-configs']

    const filteredData = Object.keys(migConfigs)
      .filter(key => key === 'all-balanced' || key.startsWith('petasus-'))
      .reduce((acc, key) => {
        acc[key] = migConfigs[key]
        return acc
      }, {})

    const result = await this.transformData(filteredData)

    return result
  }

  async transformData(data) {
    const result = { data: [] }
    console.log(JSON.stringify(data))
    for (const [name, items] of Object.entries(data)) {
      const gpuType = []
      const gpuCount = []
      const gpuTypeDetail = []

      let smCount = 0
      let useMemory = 0
      let memValue = 0
      let smCountValue = 0

      for (const item of items) {
        const devicedId = await this.getFirstDeviceFilter(item)
        const templateParams = {
          type: 'D',
          name,
          deviceId: devicedId,
        }

        // template yaml 파일에서 필요한 데이터 추출
        const migConfigTemplate = await this.getMigConfigTemplate(
          templateParams
        )

        item['mig-gpuType'] = migConfigTemplate.name.split('-')[0].toUpperCase()
        item['mig-sliceCount'] = migConfigTemplate.count
        item['mig-memory'] = migConfigTemplate.memory

        // totalMemory 계산 위한 기본 메모리 값 하나 저장
        memValue = parseInt(item['mig-memory'], 10)

        // totalSmCount 계산 위한 기본 slice 값 하나 저장
        smCountValue = parseInt(item['mig-sliceCount'], 10)

        console.log(`AAAAAAAAAA :${item['mig-gpuType']}`)
        // gpuType & gpuCount
        if (!gpuType.includes(item['mig-gpuType'])) {
          gpuType.push(item['mig-gpuType'])
        }

        // gpuCount
        const countValue =
          item.devices === 'all'
            ? 'all'
            : Array.isArray(item.devices)
            ? item.devices[0]
            : item.devices

        gpuCount.push(countValue)

        // smCount & useMemory
        for (const [key, count] of Object.entries(item['mig-devices'])) {
          const [sizeStr, memStr] = key.split('.')
          const size = parseInt(sizeStr.replace('g', ''), 10)
          const mem = parseInt(memStr.replace('gb', ''), 10)

          smCount += size * count
          useMemory += mem * count
        }

        // gpuTypeDetail
        const detailKey = `${item['mig-gpuType']}_${
          countValue == 'all' ? countValue : countValue + 1
        }`
        gpuTypeDetail.push({ [detailKey]: item['mig-devices'] })
      }

      // totalMemory
      const totalMemory = memValue * items.length

      // totalSmCount
      const totalSmCount = smCountValue * items.length

      result.data.push({
        name,
        isAllBalanced: name === 'all-balanced',
        gpuType,
        gpuCount,
        smCount,
        useMemory,
        totalMemory,
        totalSmCount,
        gpuTypeDetail,
      })
    }

    return result
  }

  async convertToMigConfigPerDevice(input) {
    const result = []

    input.migprofile.forEach(profile => {
      const deviceFilter = profile.deviceId

      profile.data.forEach(gpu => {
        const migDevices = {}

        // slices → count per GPU
        gpu.slices.forEach(slice => {
          if (!migDevices[slice]) migDevices[slice] = 0
          migDevices[slice] += 1
        })

        result.push({
          'device-filters': [deviceFilter],
          devices: [gpu.deviceIndex],
          'mig-enabled': true,
          'mig-devices': migDevices,
        })
      })
    })

    return result
  }

  async getFirstDeviceFilter(item) {
    // 1) "device-filters" 가 존재하고 배열이면
    if (Array.isArray(item['device-filters'])) {
      return item['device-filters'][0]
    }

    // 2) "device-filter" 가 배열이면
    if (Array.isArray(item['device-filter'])) {
      return item['device-filter'][0]
    }

    // 3) "device-filter" 가 문자열인 경우
    if (typeof item['device-filter'] === 'string') {
      return item['device-filter']
    }
    return null
  }
}
