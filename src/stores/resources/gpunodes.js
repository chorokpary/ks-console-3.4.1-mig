/*
 * This file is part of KubeSphere Console.
 * Copyright (C) 2024 The KubeSphere Console Authors.
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

import { get } from 'lodash'
import { action } from 'mobx'

import Base from '../basemm3'
import List from '../base.list'

import { LIST_DEFAULT_ORDER } from 'utils/constants'

export default class GpuNodeStore extends Base {
  records = new List()

  module = 'nodes'

  getResourceUrl = (params = {}) =>
    `kapis/resources.kubesphere.io/v1alpha3${this.getPath(params)}/${
      this.module
    }`

  // getResourceUrl = (params = {}) =>
  //   `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
  //     params
  //   )}/edgetron/resources/kubevirt/gpunodes`
    
  getGpuNodeUrl = (params = {}) =>
    `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
      params
    )}/edgetron/resources/kubevirt/gpu/node`

  getListUrl = this.getResourceUrl

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
      params.sortBy = LIST_DEFAULT_ORDER[this.module] || 'creation_timestamp'
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

    const result = await request.get(
      this.getListUrl({ cluster, workspace, namespace, devops, page, limit }),
      this.getFilterParams(params)
    )

    const data = (get(result, 'items') || []).filter(
        item => item.metadata.labels?.hasOwnProperty('nvidia.com/gpu.present')
      ).map(item => ({
      cluster,
      namespace,
      ...this.mapper(item),
      name: get(item, 'metadata.name'),
      creation_timestamp: get(item, 'metadata.creationTimestamp'),
      gpu_count: get(item, ['metadata', 'labels', 'nvidia.com/gpu.count'], 0),
      gpu_product: get(item, ['metadata', 'labels', 'nvidia.com/gpu.product'], ''),
      gpu_mode: get(item, ['metadata', 'labels', 'nvidia.com/gpu.mode'], ''),
      gpu_machine: get(item, ['metadata', 'labels', 'nvidia.com/gpu.machine'], ''),
    }))

    const total = get(result, 'totalItems') || 0

    // console.log("data : "+ JSON.stringify(data))


    // 초기 정렬 처리
    data.sort((a, b) => {
      return a.creation_timestamp < b.creation_timestamp
        ? 1
        : a.creation_timestamp > b.creation_timestamp
        ? -1
        : 0
    })

    // 초기 데이터 처리
    this.dataList = data


    // namespace(project) 있는 경우
    if (namespace) {
      params.project = namespace
    }

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

    this.list.update({
      data: more ? [...this.list.data, ...this.dataList] : this.dataList,
      total,
      ...params,
      limit: Number(params.limit) || 10,
      page: Number(params.page) || 1,
      isLoading: false,
      ...(this.list.silent ? {} : { selectedRowKeys: [] }),
    })

    return this.dataList
  }


  @action
  async fetchDetail(params) {
    this.isLoading = true

    const result = await request.get(
      `${this.getResourceUrl(params)}/${params.name}`
    )

    const detail = { ...params, ...this.mapper(result), kind: 'Node' }
    this.detail = detail

    // // fetch GPU devices
    // await this.fetchGpuDeviceList(params)

    // // fetch MIG configs
    // await this.fetchMigConfigs({ ...params, model: detail.gpunode.model })

    // // fetch vGPU configs
    // await this.fetchVgpuConfigs({ ...params, node: detail.gpunode.name })

    this.isLoading = false
    return detail
  }

  @action
  async fetchGpuDeviceList(params) {
    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/gpu/devices/${params.name}`
    )
    const response = {
      ...params,
      ...this.mapper(result),
      kind: 'devices',
    }
    this.gpuDeviceList = response.devices
    return response
  }

  @action
  async fetchMigConfigs(params) {
    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/gpu/mig_configs/${params.model}`
    )
    const response = {
      ...params,
      ...this.mapper(result),
      kind: 'mig_configs',
    }
    this.migConfigList = response.mig_configs
    return response
  }

  
  @action
  async applyMig(data, params) {
    const newObject = {
                        metadata: {
                          labels: {
                            'nvidia.com/mig.config': data.migprofile,
                          },
                        },
                      }
    const url =`/api/v1/nodes/${data.nodeName}`
    const res = await this.submitting(
      request.patch(url, newObject)
    )

    return res;
  }

  @action
  async applyMigRemove(data, params) {
    const newObject = {
                        metadata: {
                          labels: {
                            'nvidia.com/mig.config': "all-disabled",
                          },
                        },
                      }

    const url =`/api/v1/nodes/${data.nodeName}`
    const res = await this.submitting(
      request.patch(url, newObject)
    )

    return res;
  }

  @action
  async fetchVgpuConfigs(params) {
    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/gpu/vgpu_configs/${params.node}`
    )
    const response = {
      ...params,
      ...this.mapper(result),
      kind: 'vgpu_configs',
    }
    this.vgpuConfigList = response.vgpu_configs
    return response
  }

}
