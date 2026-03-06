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

import { action } from 'mobx'
import { get, isEmpty } from 'lodash'
import { getWorkloadVolumes } from 'utils/workload'
import Base from './base'

import { LIST_DEFAULT_ORDER } from 'utils/constants'

export default class PodStore extends Base {
  module = 'pods'

  @action
  async fetchListGpuNode({
    cluster,
    workspace,
    namespace,
    more,
    devops,
    ...params
  } = {}) {
    this.list.isLoading = true

    if (!params.sortBy && params.ascending === undefined) {
      params.sortBy = LIST_DEFAULT_ORDER[this.module] || 'createTime'
    }

    if (params.limit === Infinity || params.limit === -1) {
      params.limit = -1
      params.page = 1
    }

    params.limit = params.limit || 10

    // gpuSlice 제외
    const { gpuSlice, ...filterParams } = params

    const result = await request.get(
      this.getResourceUrl({ cluster, workspace, namespace, devops }),
      this.getFilterParams(filterParams)
    )

    const allData = (get(result, 'items') || []).map(item => ({
      cluster,
      namespace,
      ...this.mapper(item),
    }))

    // 슬라이스별 pod 추출
    const data = allData.map(item => ({
      ...item,
      containers: (item.containers || []).filter(container =>
        Object.keys(container.resources?.limits || {}).some(key =>
          key.includes(gpuSlice)
        )
      )
    })).filter(item => item.containers.length > 0);


    this.list.update({
      data: more ? [...this.list.data, ...data] : data,
      total: data.length || 0,
      ...params,
      limit: Number(params.limit) || 10,
      page: Number(params.page) || 1,
      isLoading: false,
      ...(this.list.silent ? {} : { selectedRowKeys: [] }),
    })

    return data
  }

  @action
  async fetchDetail({ cluster, namespace, name, silent }) {
    if (!silent) {
      this.isLoading = true
    }

    const result = await request.get(
      this.getDetailUrl({ cluster, namespace, name })
    )
    const detail = this.mapper(result)

    detail.cluster = cluster
    detail.volumes = await getWorkloadVolumes(detail)

    if (!isEmpty(detail.volumes)) {
      detail.containers.forEach(container => {
        if (!isEmpty(container.volumeMounts)) {
          container.volumeMounts.forEach(volumeMount => {
            const volume = detail.volumes.find(
              _volume => _volume.name === volumeMount.name
            )
            if (!isEmpty(volume)) {
              volume.containers = volume.containers || []
              volume.containers.push(container)
            }
          })
        }
      })
    }

    this.detail = detail

    if (!silent) {
      this.isLoading = false
    }

    return detail
  }
}
