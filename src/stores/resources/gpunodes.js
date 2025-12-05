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

import { action } from 'mobx'

import Base from '../basemm3'
import List from '../base.list'

export default class GpuNodeStore extends Base {
  records = new List()

  module = 'gpunodes'

  getResourceUrl = (params = {}) =>
    `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
      params
    )}/edgetron/resources/kubevirt/gpunodes`

  getGpuNodeUrl = (params = {}) =>
    `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
      params
    )}/edgetron/resources/kubevirt/gpu/node`

  getListUrl = this.getResourceUrl

  @action
  async fetchDetail(params) {
    this.isLoading = true

    const result = await request.get(
      `${this.getResourceUrl(params)}/${params.name}`
    )
    const detail = { ...params, ...this.mapper(result), kind: 'GpuNodes' }

    this.detail = detail

    // fetch GPU devices
    await this.fetchGpuDeviceList(params)

    // fetch MIG configs
    await this.fetchMigConfigs({ ...params, model: detail.gpunode.model })

    // fetch vGPU configs
    await this.fetchVgpuConfigs({ ...params, node: detail.gpunode.name })

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

    const newObject = { metadata: { labels : data.applyLabels } }

    const url =`/api/v1/nodes/${data.nodeName}`
    const res = await this.submitting(
      request.patch(url, newObject)
    )

    return res;
  }

  @action
  async applyMigRemove(data, params) {

    const applyRemoveLabels = data.applyLabels
    applyRemoveLabels['nvidia.com/mig.config'] = "all-disabled"

    const newObject = { metadata: { labels : data.applyLabels } }

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
