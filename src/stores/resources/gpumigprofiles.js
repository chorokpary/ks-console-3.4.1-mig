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
  
  configMap_namespace = ''
  configMap_mig_layouts = ''
  configMap_custom_mig_parted_config = ''
  configMap_custom_mig_parted_index_config = ''
  configMap_custom_mig_config_templates = ''

  configMapWithOutIndexParams = {}
  configMapWithIndexParams = {}

  constructor() {
    super('gpumigprofiles')

    const gpuOperatorConfig = get(globals, 'config.gpuOperator') || {}

    this.configMap_namespace = gpuOperatorConfig.namespace || 'nvidia-system'
    this.configMap_mig_layouts = gpuOperatorConfig.migLayouts || 'mig-layouts'
    this.configMap_custom_mig_parted_config = gpuOperatorConfig.migPartedConfig || 'custom-mig-parted-config'
    this.configMap_custom_mig_parted_index_config = gpuOperatorConfig.migPartedIndexConfig || 'custom-mig-parted-index-config'
    this.configMap_custom_mig_config_templates = gpuOperatorConfig.migConfigTemplates || 'custom-mig-config-templates'

    this.configMapWithOutIndexParams = {
      namespace: this.configMap_namespace,
      name: this.configMap_custom_mig_parted_config,
    }

    this.configMapWithIndexParams = {
      namespace: this.configMap_namespace,
      name: this.configMap_custom_mig_parted_index_config,
    }
  }
  
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
    // console.log(`this.dataList : ${JSON.stringify(this.dataList)}`)
    return this.dataList
  }

  async retryUpdateConfigMap(updater, maxRetries = 3) {
    let retries = 0

    while (retries < maxRetries) {
      try {
        // 1. 최신 원본 데이터 가져오기
        const resultConfigMap = await request.get(
          this.getDetailUrl(this.configMapWithIndexParams)
        )

        // 2. config.yaml 추출 및 object로 파싱
        const yamlString = get(resultConfigMap, ['data', 'config.yaml'])
        const parsed = yaml.load(yamlString)

        // 3. 전달받은 콜백 함수로 데이터 수정 적용 (예: 추가/수정/삭제)
        await updater(parsed)

        // 4. index 제외 처리 및 YAML 문자열 변환
        const parsedWithOutIndex = JSON.parse(
          JSON.stringify(parsed, (k, v) =>
            k === 'mig-devices-index' ? undefined : v
          )
        )

        const newYamlTextWithIndex = await this.convertObjectToYaml(parsed)
        const newYamlTextWithOutIndex = await this.convertObjectToYaml(
          parsedWithOutIndex
        )

        // 5. ConfigMap 구조에 다시 적용
        resultConfigMap.data['config.yaml'] = newYamlTextWithIndex
        const resultConfigMapWithOutIndex = await this.cloneResultConfigMap(
          resultConfigMap,
          newYamlTextWithOutIndex
        )

        // 6. PUT 요청 수행 (Promise.all)
        const res = await this.submitting(
          Promise.all([
            request.put(
              this.getDetailUrl(this.configMapWithIndexParams),
              resultConfigMap
            ),
            request.put(
              this.getDetailUrl(this.configMapWithOutIndexParams),
              resultConfigMapWithOutIndex
            ),
          ])
        )

        return res // 성공 시 결과 반환 후 종료
      } catch (err) {
        const status =
          err.status || (err.response && err.response.status) || err.code

        // 409 Conflict 발생 및 재시도 횟수가 남았을 경우
        if (status === 409 && retries < maxRetries - 1) {
          retries++
          console.warn(
            `[GpuMigProfilesStore] 409 Conflict 감지. 최신 ConfigMap으로 ${retries}번째 재시도합니다.`
          )
          continue
        }

        // 다른 에러이거나 최대 시도 횟수를 초과했으면 에러를 위로 던짐
        throw err
      }
    }
  }

  @action
  async create(data, params = {}) {
    const name = `petasus-${data.name}`

    return this.retryUpdateConfigMap(async parsed => {
      const migConfigs = parsed['mig-configs']
      migConfigs[name] = await this.convertToMigConfigPerDevice(data)
    })
  }

  @action
  async update(data, params = {}) {
    const name = `petasus-${data.name}`

    return this.retryUpdateConfigMap(async parsed => {
      const migConfigs = parsed['mig-configs']
      migConfigs[name] = await this.convertToMigConfigPerDevice(data)
    })
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
    const name = params.name

    return this.retryUpdateConfigMap(async parsed => {
      const migConfigs = parsed['mig-configs']
      delete migConfigs[name]
    })
  }

  async getMigConfigTemplate(params, resultConfigMap) {

    const yamlString = get(resultConfigMap, [
      'data',
      'config.yaml',
    ]) || get(resultConfigMap, [
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
      namespace: this.configMap_namespace,
      name: this.configMap_mig_layouts,
    }

    const resultConfigMap = await request.get(
      this.getDetailUrl(configMapParams)
    )

    const yamlString =
      get(resultConfigMap, ['data', 'mig-layouts.yaml']) ||
      get(resultConfigMap, ['data', 'config.yaml']) ||
      get(resultConfigMap, ['data', 'mig-layouts'])
      
    if (!yamlString) {
      return []
    }

    const parsed = yaml.load(yamlString)
    const migLayout = parsed ? parsed['mig-layouts'] : null

    if (!migLayout || !Array.isArray(migLayout)) {
      return []
    }

    let result = migLayout
      .filter(item => item.models.includes(params.name))
      .map(item => item['mig-profiles'])[0]

    return result
  }

  async createCustomConfigMap() {
    const configMapParams = {
      namespace: this.configMap_namespace,
    }
    const data = {
                  "apiVersion":"v1",
                  "kind":"ConfigMap",
                  "metadata":{
                    "namespace": this.configMap_namespace,
                    "labels":{
                    },
                    "name": this.configMap_custom_mig_parted_config,
                    "annotations":{
                      "kubesphere.io/creator":"admin"
                    }
                  },
                  "spec":{
                    "template":{
                      "metadata":{
                        "labels":{
                        },
                        "annotations":{
                          "kubesphere.io/creator":"admin"
                        }
                      }
                    }
                  },
                  "data":{
                    "config.yaml":"version: v1\nmig-configs:\n  all-disabled:\n    - devices: all\n      mig-enabled: false\n\n  all-enabled:\n    - devices: all\n      mig-enabled: true\n      mig-devices: {}\n\n  # A100-40GB, A800-40GB\n  all-1g.5gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.5gb\": 7\n\n  all-1g.5gb.me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.5gb+me\": 1\n\n  all-2g.10gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.10gb\": 3\n\n  all-3g.20gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.20gb\": 2\n\n  all-4g.20gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.20gb\": 1\n\n  all-7g.40gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.40gb\": 1\n\n  # RTX-PRO-6000-96GB\n  all-1g.24gb.gfx:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.24gb+gfx\": 4\n\n  all-1g.24gb.me.all:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.24gb+me.all\": 1\n  \n  all-1g.24gb-me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.24gb-me\": 4\n\n  all-2g.48gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.48gb\": 2\n\n  all-2g.48gb.gfx:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.48gb+gfx\": 2\n\n  all-2g.48gb.me.all:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.48gb+me.all\": 1\n\n  all-2g.48gb-me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.48gb-me\": 2\n\n  all-4g.96gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.96gb\": 1\n\n  all-4g.96gb.gfx:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.96gb+gfx\": 1\n\n  # H100-80GB, H800-80GB, A100-80GB, A800-80GB, A100-40GB, A800-40GB\n  all-1g.10gb:\n    # H100-80GB, H800-80GB, A100-80GB, A800-80GB\n    - device-filter: [\"0x233010DE\", \"0x233110DE\", \"0x232210DE\", \"0x20B210DE\", \"0x20B510DE\", \"0x20F310DE\", \"0x20F510DE\", \"0x232410DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.10gb\": 7\n\n    # A100-40GB, A800-40GB\n    - device-filter: [\"0x20B010DE\", \"0x20B110DE\", \"0x20F110DE\", \"0x20F610DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.10gb\": 4\n\n  # H100-80GB, H800-80GB, A100-80GB, A800-80GB\n  all-1g.10gb.me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.10gb+me\": 1\n\n  # H100-80GB, H800-80GB, A100-80GB, A800-80GB\n  all-1g.20gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.20gb\": 4\n\n  # GB200, B200\n  all-1g.23gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.23gb\": 7\n\n  # GB200, B200\n  all-1g.23gb.me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.23gb+me\": 1\n\n  all-1g.24gb.me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.24gb+me\": 1\n\n  all-2g.20gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.20gb\": 3\n\n  all-3g.40gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.40gb\": 2\n\n  all-4g.40gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.40gb\": 1\n\n  all-7g.80gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.80gb\": 1\n\n  # A30-24GB\n  all-1g.6gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.6gb\": 4\n\n  all-1g.6gb.me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.6gb+me\": 1\n\n  all-2g.12gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.12gb\": 2\n\n  all-2g.12gb.me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.12gb+me\": 1\n\n  all-4g.24gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.24gb\": 1\n\n  # H100 NVL, H800 NVL, GH200\n  all-1g.12gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.12gb\": 7\n\n  all-1g.12gb.me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.12gb+me\": 1\n\n  all-1g.24gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.24gb\": 4\n\n  all-1g.45gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.45gb\": 4\n\n  all-1g.47gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.47gb\": 4\n\n  all-2g.24gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.24gb\": 3\n\n  all-2g.45gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.45gb\": 3\n\n  all-2g.47gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.47gb\": 3\n\n  # H100 NVL, H800 NVL\n  all-3g.47gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.47gb\": 2\n\n  all-4g.47gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.47gb\": 1\n\n  all-7g.94gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.94gb\": 1\n\n  # H100-96GB, PG506-96GB, GH200\n  all-3g.48gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.48gb\": 2\n\n  all-3g.90gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.90gb\": 2\n\n  all-3g.93gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.93gb\": 2\n\n  all-3g.95gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.95gb\": 2\n\n  all-4g.48gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.48gb\": 1\n\n  all-4g.90gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.90gb\": 1\n\n  all-4g.93gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.93gb\": 1\n\n  all-4g.95gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.95gb\": 1\n\n  all-7g.96gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.96gb\": 1\n\n  all-7g.180gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.180gb\": 1\n\n  all-7g.186gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.186gb\": 1\n\n  all-7g.189gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.189gb\": 1\n\n  # GB200 HGX, B200, GH200 144G HBM3e, H200-141GB, H200 NVL, H100-96GB, GH200, H100 NVL, H800 NVL, H100-80GB, H800-80GB, A800-40GB, A800-80GB, A100-40GB, A100-80GB, A30-24GB, PG506-96GB\n  all-balanced:\n    # GB200 HGX\n    - device-filter: [\"0x294110DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.23gb\": 2\n        \"2g.47gb\": 1\n        \"3g.93gb\": 1\n    \n    # RTX-PRO-6000-96GB\n    - device-filter: [\"0x2BB510DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.24gb\": 2\n        \"2g.48gb\": 1\n\n    # B200\n    - device-filter: [\"0x290110DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.23gb\": 2\n        \"2g.45gb\": 1\n        \"3g.90gb\": 1\n\n    # GH200 144G HBM3e\n    - device-filter: [\"0x234810DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.18gb\": 2\n        \"2g.36gb\": 1\n        \"3g.72gb\": 1\n\n    # H200 141GB, H200 NVL\n    - device-filter: [\"0x233510DE\", \"0x233B10DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.18gb\": 2\n        \"2g.35gb\": 1\n        \"3g.71gb\": 1\n\n    # H100 NVL, H800 NVL\n    - device-filter: [\"0x232110DE\", \"0x233A10DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.12gb\": 2\n        \"2g.24gb\": 1\n        \"3g.47gb\": 1\n\n    # H100-80GB, H800-80GB, A100-80GB, A800-80GB\n    - device-filter: [\"0x233010DE\", \"0x233110DE\", \"0x232210DE\", \"0x20B210DE\", \"0x20B510DE\", \"0x20F310DE\", \"0x20F510DE\", \"0x232410DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.10gb\": 2\n        \"2g.20gb\": 1\n        \"3g.40gb\": 1\n\n    # A100-40GB, A800-40GB\n    - device-filter: [\"0x20B010DE\", \"0x20B110DE\", \"0x20F110DE\", \"0x20F610DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.5gb\": 2\n        \"2g.10gb\": 1\n        \"3g.20gb\": 1\n\n    # A30-24GB\n    - device-filter: \"0x20B710DE\"\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.6gb\": 2\n        \"2g.12gb\": 1\n\n    # H100-96GB, PG506-96GB, GH200, H20\n    - device-filter: [\"0x234210DE\", \"0x233D10DE\", \"0x20B610DE\", \"0x232910DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.12gb\": 2\n        \"2g.24gb\": 1\n        \"3g.48gb\": 1\n\n  # H200-141GB, GH200 144G HBM3e\n  all-1g.18gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.18gb\": 7\n\n  all-1g.18gb.me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.18gb+me\": 1\n\n  # H200-141GB\n  all-1g.35gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.35gb\": 4\n\n  all-2g.35gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.35gb\": 3\n\n  all-3g.71gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.71gb\": 2\n\n  all-4g.71gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.71gb\": 1\n\n  all-7g.141gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.141gb\": 1\n\n  # GH200 144G HBM3e\n  all-1g.36gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.36gb\": 4\n\n  all-2g.36gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.36gb\": 3\n\n  all-3g.72gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.72gb\": 2\n\n  all-4g.72gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.72gb\": 1\n\n  all-7g.144gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.144gb\": 1\n"
                    }
                  }

    const result = await request.post(this.getListUrl(configMapParams),  data)
    return result
  }

   async createCustomConfigMapWithIndex() {
    const configMapParams = {
      namespace: this.configMap_namespace,
    }
    const data = {
                  "apiVersion":"v1",
                  "kind":"ConfigMap",
                  "metadata":{
                    "namespace": this.configMap_namespace,
                    "labels":{
                    },
                    "name": this.configMap_custom_mig_parted_index_config,
                    "annotations":{
                      "kubesphere.io/creator":"admin"
                    }
                  },
                  "spec":{
                    "template":{
                      "metadata":{
                        "labels":{
                        },
                        "annotations":{
                          "kubesphere.io/creator":"admin"
                        }
                      }
                    }
                  },
                  "data":{
                    "config.yaml":"version: v1\nmig-configs:\n  all-disabled:\n    - devices: all\n      mig-enabled: false\n\n  all-enabled:\n    - devices: all\n      mig-enabled: true\n      mig-devices: {}\n\n  # A100-40GB, A800-40GB\n  all-1g.5gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.5gb\": 7\n\n  all-1g.5gb.me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.5gb+me\": 1\n\n  all-2g.10gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.10gb\": 3\n\n  all-3g.20gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.20gb\": 2\n\n  all-4g.20gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.20gb\": 1\n\n  all-7g.40gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.40gb\": 1\n\n  # RTX-PRO-6000-96GB\n  all-1g.24gb.gfx:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.24gb+gfx\": 4\n\n  all-1g.24gb.me.all:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.24gb+me.all\": 1\n  \n  all-1g.24gb-me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.24gb-me\": 4\n\n  all-2g.48gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.48gb\": 2\n\n  all-2g.48gb.gfx:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.48gb+gfx\": 2\n\n  all-2g.48gb.me.all:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.48gb+me.all\": 1\n\n  all-2g.48gb-me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.48gb-me\": 2\n\n  all-4g.96gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.96gb\": 1\n\n  all-4g.96gb.gfx:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.96gb+gfx\": 1\n\n  # H100-80GB, H800-80GB, A100-80GB, A800-80GB, A100-40GB, A800-40GB\n  all-1g.10gb:\n    # H100-80GB, H800-80GB, A100-80GB, A800-80GB\n    - device-filter: [\"0x233010DE\", \"0x233110DE\", \"0x232210DE\", \"0x20B210DE\", \"0x20B510DE\", \"0x20F310DE\", \"0x20F510DE\", \"0x232410DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.10gb\": 7\n\n    # A100-40GB, A800-40GB\n    - device-filter: [\"0x20B010DE\", \"0x20B110DE\", \"0x20F110DE\", \"0x20F610DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.10gb\": 4\n\n  # H100-80GB, H800-80GB, A100-80GB, A800-80GB\n  all-1g.10gb.me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.10gb+me\": 1\n\n  # H100-80GB, H800-80GB, A100-80GB, A800-80GB\n  all-1g.20gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.20gb\": 4\n\n  # GB200, B200\n  all-1g.23gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.23gb\": 7\n\n  # GB200, B200\n  all-1g.23gb.me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.23gb+me\": 1\n\n  all-1g.24gb.me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.24gb+me\": 1\n\n  all-2g.20gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.20gb\": 3\n\n  all-3g.40gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.40gb\": 2\n\n  all-4g.40gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.40gb\": 1\n\n  all-7g.80gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.80gb\": 1\n\n  # A30-24GB\n  all-1g.6gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.6gb\": 4\n\n  all-1g.6gb.me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.6gb+me\": 1\n\n  all-2g.12gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.12gb\": 2\n\n  all-2g.12gb.me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.12gb+me\": 1\n\n  all-4g.24gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.24gb\": 1\n\n  # H100 NVL, H800 NVL, GH200\n  all-1g.12gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.12gb\": 7\n\n  all-1g.12gb.me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.12gb+me\": 1\n\n  all-1g.24gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.24gb\": 4\n\n  all-1g.45gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.45gb\": 4\n\n  all-1g.47gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.47gb\": 4\n\n  all-2g.24gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.24gb\": 3\n\n  all-2g.45gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.45gb\": 3\n\n  all-2g.47gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.47gb\": 3\n\n  # H100 NVL, H800 NVL\n  all-3g.47gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.47gb\": 2\n\n  all-4g.47gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.47gb\": 1\n\n  all-7g.94gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.94gb\": 1\n\n  # H100-96GB, PG506-96GB, GH200\n  all-3g.48gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.48gb\": 2\n\n  all-3g.90gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.90gb\": 2\n\n  all-3g.93gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.93gb\": 2\n\n  all-3g.95gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.95gb\": 2\n\n  all-4g.48gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.48gb\": 1\n\n  all-4g.90gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.90gb\": 1\n\n  all-4g.93gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.93gb\": 1\n\n  all-4g.95gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.95gb\": 1\n\n  all-7g.96gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.96gb\": 1\n\n  all-7g.180gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.180gb\": 1\n\n  all-7g.186gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.186gb\": 1\n\n  all-7g.189gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.189gb\": 1\n\n  # GB200 HGX, B200, GH200 144G HBM3e, H200-141GB, H200 NVL, H100-96GB, GH200, H100 NVL, H800 NVL, H100-80GB, H800-80GB, A800-40GB, A800-80GB, A100-40GB, A100-80GB, A30-24GB, PG506-96GB\n  all-balanced:\n    # GB200 HGX\n    - device-filter: [\"0x294110DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.23gb\": 2\n        \"2g.47gb\": 1\n        \"3g.93gb\": 1\n    \n    # RTX-PRO-6000-96GB\n    - device-filter: [\"0x2BB510DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.24gb\": 2\n        \"2g.48gb\": 1\n\n    # B200\n    - device-filter: [\"0x290110DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.23gb\": 2\n        \"2g.45gb\": 1\n        \"3g.90gb\": 1\n\n    # GH200 144G HBM3e\n    - device-filter: [\"0x234810DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.18gb\": 2\n        \"2g.36gb\": 1\n        \"3g.72gb\": 1\n\n    # H200 141GB, H200 NVL\n    - device-filter: [\"0x233510DE\", \"0x233B10DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.18gb\": 2\n        \"2g.35gb\": 1\n        \"3g.71gb\": 1\n\n    # H100 NVL, H800 NVL\n    - device-filter: [\"0x232110DE\", \"0x233A10DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.12gb\": 2\n        \"2g.24gb\": 1\n        \"3g.47gb\": 1\n\n    # H100-80GB, H800-80GB, A100-80GB, A800-80GB\n    - device-filter: [\"0x233010DE\", \"0x233110DE\", \"0x232210DE\", \"0x20B210DE\", \"0x20B510DE\", \"0x20F310DE\", \"0x20F510DE\", \"0x232410DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.10gb\": 2\n        \"2g.20gb\": 1\n        \"3g.40gb\": 1\n\n    # A100-40GB, A800-40GB\n    - device-filter: [\"0x20B010DE\", \"0x20B110DE\", \"0x20F110DE\", \"0x20F610DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.5gb\": 2\n        \"2g.10gb\": 1\n        \"3g.20gb\": 1\n\n    # A30-24GB\n    - device-filter: \"0x20B710DE\"\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.6gb\": 2\n        \"2g.12gb\": 1\n\n    # H100-96GB, PG506-96GB, GH200, H20\n    - device-filter: [\"0x234210DE\", \"0x233D10DE\", \"0x20B610DE\", \"0x232910DE\"]\n      devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.12gb\": 2\n        \"2g.24gb\": 1\n        \"3g.48gb\": 1\n\n  # H200-141GB, GH200 144G HBM3e\n  all-1g.18gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.18gb\": 7\n\n  all-1g.18gb.me:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.18gb+me\": 1\n\n  # H200-141GB\n  all-1g.35gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.35gb\": 4\n\n  all-2g.35gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.35gb\": 3\n\n  all-3g.71gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.71gb\": 2\n\n  all-4g.71gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.71gb\": 1\n\n  all-7g.141gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.141gb\": 1\n\n  # GH200 144G HBM3e\n  all-1g.36gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"1g.36gb\": 4\n\n  all-2g.36gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"2g.36gb\": 3\n\n  all-3g.72gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"3g.72gb\": 2\n\n  all-4g.72gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"4g.72gb\": 1\n\n  all-7g.144gb:\n    - devices: all\n      mig-enabled: true\n      mig-devices:\n        \"7g.144gb\": 1\n"
                    }
                  }

    const result = await request.post(this.getListUrl(configMapParams),  data)
    return result
  }

  async getAllListData() {
    const configMapParams = {
      namespace: this.configMap_namespace,
      name: this.configMap_custom_mig_parted_index_config,
    }

    let resultConfigMap = await request.get(
      this.getDetailUrl(configMapParams), {}, {},
      (error) => {
        return null
      }
    )

    // custom-mig-parted-config 이 없으면 신규 생성
    if(!resultConfigMap){
      resultConfigMap = await this.createCustomConfigMap()
      await this.createCustomConfigMapWithIndex()
    }
    
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

  async getCustomMigConfig() {
    const configMapParams = {
      namespace: this.configMap_namespace,
      name: this.configMap_custom_mig_config_templates,
    }
    // /api/v1/namespaces/nvidia/configmaps/custom-mig-config-templates
    const resultCustomMigConfig = await request.get(this.getDetailUrl(configMapParams))

    return resultCustomMigConfig
  }

  async transformData(data) {
    const result = { data: [] }

    const configMapParams = {
      namespace: this.configMap_namespace,
      name: this.configMap_custom_mig_config_templates,
    }
    // /api/v1/namespaces/nvidia/configmaps/custom-mig-config-templates
    const resultCustomMigConfig = await request.get(this.getDetailUrl(configMapParams))

    for (const [name, items] of Object.entries(data)) {
      const gpuType = []
      const gpuCount = []
      const gpuTypeDetail = []
      const gpuTypeSliceMemory = []

      let smCount = 0
      let useMemory = 0
      let smCountValue = 0
      let totalMemory = 0
      let totalSmCount = 0

      for (const item of items) {
        const devicedId = await this.getFirstDeviceFilter(item)
      
        const templateParams = {
          type: 'D',
          name,
          deviceId: devicedId,
        }

        // template yaml 파일에서 필요한 데이터 추출
        const migConfigTemplate = await this.getMigConfigTemplate(
          templateParams,
          resultCustomMigConfig
        )

        item['mig-gpuType'] = migConfigTemplate.name.split('-')[0].toUpperCase()
        item['mig-sliceCount'] = migConfigTemplate.count
        item['mig-memory'] = migConfigTemplate.memory
        
        // totalMemory 계산
        totalMemory += parseInt(item['mig-memory'], 10)

        // totalSmCount 계산 위한 기본 slice 값 하나 저장
        smCountValue = parseInt(item['mig-sliceCount'], 10)

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
        if (item['mig-devices'] && typeof item['mig-devices'] === 'object') {
          for (const [key, count] of Object.entries(item['mig-devices'])) {
            const [sizeStr, memStr] = key.split('.')
            const size = parseInt(sizeStr.replace('g', ''), 10)
            const mem = parseInt(memStr.replace('gb', ''), 10)

            smCount += size * count
            useMemory += mem * count
          }
        }

        // gpuTypeDetail
        const detailKey = `${item['mig-gpuType']}_${
          countValue == 'all' ? countValue : countValue + 1
        }`
        gpuTypeDetail.push({ [detailKey]: name === 'all-balanced' ? item['mig-devices'] : item['mig-devices-index'] })
        gpuTypeSliceMemory.push({ [detailKey]: parseInt(item['mig-memory'], 10)})
      }
      
      // totalSmCount
      totalSmCount = smCountValue * items.length

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
        gpuTypeSliceMemory,
      })
    }

    return result
  }

  async convertObjectToYaml(parsed) {
      
      let newYamlText = yaml.dump(parsed, {
        indent: 2,
        noRefs: true,
        lineWidth: -1,
        flowLevel: -1,
      })
  
      newYamlText = await this.convertBlockArrayToFlow(newYamlText, 'device-filter')
      newYamlText = await this.convertBlockArrayToFlow(newYamlText, 'devices')
      newYamlText = await this.quoteMigDevicesKeys(newYamlText)
      newYamlText = await this.addSpacingBetweenConfigs(newYamlText)
  
      return newYamlText
  }

  async cloneResultConfigMap(resultConfigMap, newYamlText) {

      const resultConfigMapWithIndex = {
      ...resultConfigMap,
      metadata: {
        ...resultConfigMap.metadata,
        name: this.configMap_custom_mig_parted_config
      },
      data: {
        ...resultConfigMap.data,
        ['config.yaml']: newYamlText
      }
    }

    delete resultConfigMapWithIndex.metadata.uid
    delete resultConfigMapWithIndex.metadata.resourceVersion
    delete resultConfigMapWithIndex.metadata.creationTimestamp
    delete resultConfigMapWithIndex.metadata.managedFields
     
    return resultConfigMapWithIndex
  }

  async convertBlockArrayToFlow(yamlText, key) {
    const regex = new RegExp(
        `(^|\\n)([ \\t-]*)${key}:\\s*\\n((?:\\s*-\\s*.+\\n)+)`,
        'g'
      )

      return yamlText.replace(regex, (match, leadingNewline, indent, group) => {
        const values = group
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^\s*-\s*/, '').trim())

        return `${leadingNewline}${indent}${key}: [${values.join(', ')}]\n`
      })
  }

  async quoteMigDevicesKeys(yamlText) {
    const lines = yamlText.split('\n')
    let inMigDevices = false

    return lines.map(line => {
      if (line.trim() === 'mig-devices:') {
        inMigDevices = true
        return line
      }

      if (inMigDevices) {
        if (/^\s{2,}[^\s":]+:\s+\d+/.test(line)) {
          return line.replace(
            /^(\s+)([^\s":]+):/,
            '$1"$2":'
          )
        }

        if (!line.startsWith(' ')) {
          inMigDevices = false
        }
      }

      return line
    }).join('\n')
  }

  async addSpacingBetweenConfigs(yamlText) {
    const lines = yamlText.split('\n');
    const result = [];

    let insideMigConfigs = false;
    let firstConfigSeen = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // mig-configs 시작
      if (line.trim() === 'mig-configs:') {
        insideMigConfigs = true;
        firstConfigSeen = false;
        result.push(line);
        continue;
      }

      // mig-configs 하위 config 감지 (2칸 들여쓰기 + key:)
      if (insideMigConfigs && /^ {2}[^\s].*:$/.test(line)) {
        
        // 첫 config 제외하고 blank line 추가
        if (firstConfigSeen) {
          if (result[result.length - 1] !== '') {
            result.push('');
          }
        }

        firstConfigSeen = true;
        result.push(line);
        continue;
      }

      result.push(line);
    }

    return result.join('\n');
  }

  async convertToMigConfigPerDevice(input) {
    const result = []

    input.migprofile.forEach(profile => {
      const deviceFilter = profile.deviceId

      profile.data.forEach(gpu => {
 
        // slices → count per GPU
        const migDevices = {}
        gpu.slices.forEach(slice => {
          if (!migDevices[slice]) migDevices[slice] = 0
          migDevices[slice] += 1
        })

        const migDevicesIndex = {}
        gpu.slices.forEach((v, i) => {
          migDevicesIndex[`${v}_${i}`] = 1
        })

        result.push({
          // 항상 배열 (all 없음)
          'device-filter': [deviceFilter],

          // devices 는 조건 처리
          devices:
            gpu.deviceIndex === 'all'
              ? 'all'
              : [gpu.deviceIndex],

          'mig-enabled': true,

          // object 유지
          'mig-devices': migDevices,
          'mig-devices-index': migDevicesIndex,
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
