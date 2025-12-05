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

import { get } from 'lodash'
import { action } from 'mobx'

import { LIST_DEFAULT_ORDER } from 'utils/constants'

import Base from '../basemm3' // mm3 관련 추가 파일
import List from '../base.list'

export default class VmStore extends Base {
  records = new List()

  module = 'vms'

  getResourceUrl = (params = {}) =>
    `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
      params
    )}/edgetron/resources/kubevirt/vms`

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

    const data = (get(result, 'vms') || []).map(item => ({
      cluster,
      namespace,
      project_name: `${item.project}/${item.name}`,
      ...this.mapper(item),
    }))

    const total = get(result, 'total') || 0

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

    // FloatingIp List 추출
    await this.fetchFloatingList({ cluster, namespace })

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
  async create(data, params = {}) {
    const url = this.getResourceUrl(params)

    const jsonData = {}
    const resourceData = {}

    resourceData.project = data.project
    resourceData.name = data.name
    resourceData.image = data.imageType === 'I' ? data.image : ''
    resourceData.flavor = data.flavor
    resourceData.keypair = data.keypair
    // resourceData.pre_installed_app = data.preInstalledApp

    // 값 전달 시 invalid_boot_volume 오류 발생
    resourceData.boot_dv = data.imageType === 'I' ? '' : data.bootvolume

    resourceData.bus_type = data.busType

    resourceData.secure_boot = data.secureBoot

    const securityGroupsArray = []
    data.securitygroup.forEach(name => {
      securityGroupsArray.push(name)
    })
    resourceData.security_groups = securityGroupsArray

    const networksArray = []
    data.network.forEach(name => {
      const networkObj = {}
      networkObj.network_name = name
      const fixedIpObj = data.ips.find(obj => obj.network_name === name)
      if (fixedIpObj !== undefined) {
        networksArray.push(fixedIpObj)
      } else {
        networksArray.push(networkObj)
      }
    })
    resourceData.networks = networksArray

    // api에서 이름 넣으면 스크립트 오류 발생 함
    // resourceData.username = globals.user.username; // Failed to validate the cloud-init script 오류나서 안보냄
    resourceData.username = ''
    resourceData.user_script = data.makeScript
    // data.userScript === '' || data.userScript === undefined
    //   ? data.makeScript
    //   : data.userScript

    const sriovNetworksArray = []
    data.sriov.forEach(name => {
      const sriovNetworkObj = {}
      sriovNetworkObj.network_name = name
      const fixedIpObj = data.sriovIps.find(obj => obj.network_name === name)
      if (fixedIpObj !== undefined) {
        sriovNetworksArray.push(fixedIpObj)
      } else {
        sriovNetworksArray.push(sriovNetworkObj)
      }
    })
    resourceData.sriov_networks = sriovNetworksArray

    const physicalnetworksArray = []
    data.physicalnetwork.forEach(name => {
      const physicalnetworkObj = {}
      physicalnetworkObj.network_name = name
      const fixedIpObj = data.physicalnetworkIps.find(
        obj => obj.network_name === name
      )
      if (fixedIpObj !== undefined) {
        physicalnetworksArray.push(fixedIpObj)
      } else {
        physicalnetworksArray.push(physicalnetworkObj)
      }
    })
    resourceData.physical_networks = physicalnetworksArray

    const hostDeviceArray = []
    resourceData.host_devices = hostDeviceArray

    const gpuDeviceArray = []
    resourceData.gpus = gpuDeviceArray

    if (
      data.node !== 'N/A' &&
      data.imageType !== 'B' &&
      hostDeviceArray.length === 0 &&
      gpuDeviceArray.length === 0
    ) {
      resourceData.node = data.node
    }

    resourceData.description = data.description
    resourceData.storage_class = data.storageClass
    resourceData.network_storage = data.networkStorage

    // if (data.preInstalledApp === 'Jupyter') {
    //   resourceData.jupyter_port = data.scriptJupyterPort
    //   resourceData.jupyter_token = data.scriptJupyterToken
    // }

    jsonData.vm = resourceData

    return await this.submitting(request.post(url, jsonData))
  }

  @action
  async update({ ...params }, data) {
    const jsonData = {}
    const vmData = {}

    vmData.id = params.name
    vmData.project = params.project ? params.project : params.namespace
    vmData.description = data.description ? data.description : ''

    jsonData.vm = vmData

    // id로 수정해야해서 치환
    await this.submitting(
      request.put(this.getDetailUrl({ ...params }), jsonData)
    )
  }

  @action
  async updateSecurity({ ...detail }, data) {
    const scurityGroups = data.scurityGroups
    const project = detail.project ? detail.project : detail.namespace
    const jsonDataSecurity = {}
    const vmDataSecurity = {}

    vmDataSecurity.id = detail.name
    vmDataSecurity.project = project
    vmDataSecurity.security_groups = scurityGroups

    jsonDataSecurity.vm = vmDataSecurity

    await this.submitting(
      request.put(
        `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
          detail
        )}/edgetron/resources/kubevirt/vms/${detail.name}/security_groups`,
        jsonDataSecurity
      )
    )
  }

  @action
  async updateFlavor({ ...detail }, data) {
    const jsonData = {}
    const flavorData = {}

    flavorData.id = data.id
    flavorData.project = detail.project ? detail.project : detail.namespace
    flavorData.flavor = data.flavor

    jsonData.vm = flavorData

    await this.submitting(
      request.put(
        `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
          detail
        )}/edgetron/resources/kubevirt/vms/${detail.name}/flavor`,
        jsonData
      )
    )
  }

  @action
  async fetchDetail(params) {
    this.isLoading = true
    const project = params.project ? params.project : params.namespace

    const url = `${this.getResourceUrl(params)}/${params.name}/info`

    const result = await request.get(url, { project })
    const detail = { ...params, ...this.mapper(result), kind: 'vms' }

    // Yaml 파일 관련
    await this.fetchYaml(project, params)

    // FloatingIp 관련
    await this.fetchVmListFloating(params)

    // Volume 관련
    await this.fetchVolumeList(project, params)

    // SecurityGroup 관련
    await this.fetchVmListSecurityGroup({
      ...params,
      namespace: project,
    })

    // Network
    await this.fetchVmListNetwork(params)

    // SRIOV Network
    await this.fetchVmListSriovNetwork(params)

    // Physical Network
    await this.fetchVmListPhysicalNetwork(params)

    // Network Storage
    if (detail.vm.network_storage !== '') {
      await this.fetchVmListNetworkStorage({
        ...params,
        namespace: detail.vm.project,
        name: detail.vm.network_storage,
      })
    }

    this.detail = detail
    this.isLoading = false

    return detail
  }

  @action
  async fetchVmStatus(params) {
    this.isLoading = true
    const project = params.project ? params.project : params.namespace
    const result = await request.get(
      `${this.getResourceUrl(params)}/${params.name}/status`,
      { project }
    )
    const response = { ...params, ...this.mapper(result), kind: 'vms' }

    this.isLoading = false
    return response
  }

  @action
  async fetchVmState(params) {
    this.isLoading = true
    const project = params.project ? params.project : params.namespace
    const result = await request.get(
      `${this.getResourceUrl(params)}/${params.name}/state`,
      { project }
    )
    const response = { ...params, ...this.mapper(result), kind: 'vms' }

    this.isLoading = false
    return response
  }

  @action
  async fetchYaml(project, params) {
    this.isLoading = true

    const result = await request.get(
      `${this.getResourceUrl(params)}/${params.name}/manifest`,
      { project }
    )
    const yamlData = { ...params, ...this.mapper(result), kind: 'vms' }

    this.yaml = yamlData.manifest
    this.isLoading = false
    return yamlData
  }

  @action
  async fetchVmLog(params) {
    this.isLoading = true
    const project = params.project ? params.project : params.namespace

    try {
      const result = await request.get(
        `${this.getResourceUrl(params)}/${params.name}/log`,
        { project }
      )
      const response = { ...params, ...this.mapper(result), kind: 'vms' }

      this.isLoading = false
      return response.log.message
    } catch (e) {
      return []
    }
  }

  @action
  async fetchVmEventList(params) {
    this.isLoading = true
    const project = params.project ? params.project : params.namespace
    const result = await request.get(
      `${this.getResourceUrl(params)}/${params.name}/event`,
      { project }
    )
    const response = { ...params, ...this.mapper(result), kind: 'vms' }

    this.isLoading = false
    return response
  }

  @action
  async fetchVmPhaseEventList(params) {
    this.isLoading = true
    const project = params.project ? params.project : params.namespace
    const result = await request.get(
      `${this.getResourceUrl(params)}/${params.name}/phase_event`,
      { project }
    )
    const response = { ...params, ...this.mapper(result), kind: 'vme' }

    this.isLoading = false
    return response
  }

  @action
  async fetchVmMetering(params) {
    this.isLoading = true
    const project = params.project ? params.project : params.namespace
    const result = await request.get(
      `${this.getResourceUrl(params)}/${params.name}/metering`,
      { project }
    )
    const response = { ...params, ...this.mapper(result), kind: 'vme' }

    this.isLoading = false
    return response.metering
  }

  @action
  async batchDelete({ rowKeyNames, ...params }) {
    await this.submitting(
      Promise.all(
        rowKeyNames.map(name =>
          request.delete(
            `${this.getResourceUrl({ name, ...params })}/${name}`,
            {
              project: params.namespace,
            }
          )
        )
      )
    )
    this.list.selectedRowKeys = []
  }

  @action
  async clusterBatchDelete({ rowKeys, ...params }) {
    const rowKeyDict = rowKeys.map(key => {
      const [project, name] = key.split('/')
      return { project, name }
    })
    await this.submitting(
      Promise.all(
        rowKeyDict.map(rowKey =>
          request.delete(
            `${this.getDetailUrl({ name: rowKey.name, ...params })}`,
            {
              project: rowKey.project,
            }
          )
        )
      )
    )
    this.list.selectedRowKeys = []
  }

  @action
  delete(params) {
    const project = params.project ? params.project : params.namespace

    return this.submitting(
      request.delete(`${this.getDetailUrl(params)}`, { project })
    )
  }

  @action
  async actionState({ data, ...params }) {
    const jsonData = {}
    const name = data.vmName
    jsonData.action = data.actionType
    jsonData.project = data.project

    await this.submitting(
      request.put(`${this.getDetailUrl({ name, ...params })}/action`, jsonData)
    )
  }

  @action
  async fetchFloatingList(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/floating_ips`
    )
    const dataList = { ...params, ...this.mapper(result), kind: 'floating' }

    this.floatingIpList = dataList.floating_ips
    this.isLoading = false
    return dataList
  }

  @action
  async fetchVolumeList(project, params) {
    this.isLoading = true

    try {
      const result = await request.get(
        `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
          params
        )}/edgetron/resources/kubevirt/volumes/vm/${params.name}`,
        { project }
      )
      const dataList = { ...params, ...this.mapper(result), kind: 'volumes' }

      this.volumeList = dataList.volumes
      this.isLoading = false
      return dataList
    } catch (e) {
      this.volumeList = []
      return []
    }
  }

  // 등록 관련 데이터 시작
  @action
  async fetchVmListFlavor(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/flavors`
    )
    const response = { ...params, ...this.mapper(result), kind: 'flavors' }

    const sortType = params?.ascending ? 'desc' : 'asc'
    if (params?.sortBy) {
      response.flavors.sort((a, b) => {
        const x = a[params.sortBy]
        const y = b[params.sortBy]
        if (sortType === 'desc') {
          return x > y ? -1 : x < y ? 1 : 0
        }
        return x < y ? -1 : x > y ? 1 : 0
      })
    }

    this.isLoading = false
    return response
  }

  @action
  async fetchVmListImage(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/images`
    )
    const response = { ...params, ...this.mapper(result), kind: 'images' }

    this.isLoading = false
    return response
  }

  @action
  async fetchVmListBootVolume(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/boot_volumes/available`
    )
    const response = { ...params, ...this.mapper(result), kind: 'volumes' }

    this.isLoading = false
    return response
  }

  @action
  async fetchVmListNetwork(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/vm_networks`
    )
    const response = { ...params, ...this.mapper(result), kind: 'networks' }

    if (params?.namespace) {
      response.networks = response.networks.filter(
        item => item.project === params.namespace
      )
    }

    this.networksList = response.networks
    this.isLoading = false
    return response
  }

  @action
  async fetchVmListNetworkStorage(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/network_storages/${params.name}?project=${
        params.namespace
      }`
    )
    const response = {
      ...params,
      ...this.mapper(result),
      kind: 'networkstorage',
    }

    this.networkStorageInfo = response.network_storage
    this.isLoading = false
    return response
  }

  @action
  async fetchAllAvailableIps(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/networks/available_ips`
    )
    const response = { ...params, ...this.mapper(result), kind: 'all_ips' }

    this.isLoading = false
    return response
  }

  @action
  async fetchVmListSriovNetwork(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/sriov_networks`
    )
    const response = {
      ...params,
      ...this.mapper(result),
      kind: 'sriov_networks',
    }

    if (params?.namespace) {
      response.sriovs = response.sriovs?.filter(
        item => item.project === params.namespace
      )
    }
    this.sriov_networks = response.sriovs
    this.isLoading = false
    return response
  }

  @action
  async fetchAllAvailableSriovIps(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/sriov_networks/available_ips`
    )
    const response = { ...params, ...this.mapper(result), kind: 'all_ips' }

    this.isLoading = false
    return response
  }

  @action
  async fetchVmListPhysicalNetwork(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/physical_networks`
    )
    const response = {
      ...params,
      ...this.mapper(result),
      kind: 'physicalnetworks',
    }

    if (params?.namespace) {
      response.physicalnetworks = response.physicalnetworks.filter(
        item => item.project === params.namespace
      )
    }

    this.physicalnetworksList = response.physicalnetworks
    this.isLoading = false
    return response
  }

  @action
  async fetchAllAvailablePhysicalIps(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/physical_networks/available_ips`
    )
    const response = { ...params, ...this.mapper(result), kind: 'all_ips' }

    this.isLoading = false
    return response
  }

  @action
  async fetchVmListKeypair(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/keypairs`
    )
    const response = { ...params, ...this.mapper(result), kind: 'keypairs' }

    if (params.namespace) {
      response.keypairs = response.keypairs.filter(
        item => item.project === params.namespace
      )
    }

    this.isLoading = false
    return response
  }

  @action
  async fetchVmListNode(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/nodes`
    )
    const response = { ...params, ...this.mapper(result), kind: 'nodes' }

    this.isLoading = false
    return response
  }

  @action
  async fetchVmListRouter(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/routers`
    )
    const response = { ...params, ...this.mapper(result), kind: 'routers' }

    if (params?.namespace) {
      response.routers = response.routers.filter(
        item => item.project === params.namespace
      )
    }

    this.isLoading = false
    return response
  }

  @action
  async fetchVmListFloating(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/floating_ips`
    )
    const response = {
      ...params,
      ...this.mapper(result),
      kind: 'floating_ips',
    }

    if (params?.namespace) {
      response.floating_ips = response.floating_ips.filter(
        item => item.project === params.namespace
      )
    }

    this.floatingList = response.floating_ips
    this.isLoading = false
    return response
  }

  @action
  async fetchVmListSecurityGroupSummray(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/security_groups`
    )
    const response = {
      ...params,
      ...this.mapper(result),
      kind: 'security_groups',
    }

    let namespaceDataList = []
    if (params.namespace) {
      namespaceDataList = response.security_groups.filter(
        item => item.project === params.namespace
      )
    }

    const dataList = params.namespace
      ? namespaceDataList
      : response.security_groups
    this.isLoading = false
    return dataList
  }

  @action
  async fetchVmListSecurityGroup(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/security_groups?project=${
        params.namespace
      }`
    )
    const response = {
      ...params,
      ...this.mapper(result),
      kind: 'security_groups',
    }

    const securityArray = []
    const promises = response.security_groups.map(async security => {
      const securityDetail = await request.get(
        `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
          params
        )}/edgetron/resources/kubevirt/security_groups/${
          security.name
        }?project=${params.namespace}`
      )

      securityDetail.security_group.egress = securityDetail.security_group.rules.filter(
        el => el.direction === 'egress'
      ).length
      securityDetail.security_group.ingress = securityDetail.security_group.rules.filter(
        el => el.direction === 'ingress'
      ).length

      securityArray.push(securityDetail.security_group)
    })

    await Promise.all(promises)

    let namespaceDataList = []
    if (params.namespace) {
      namespaceDataList = securityArray.filter(
        item => item.project === params.namespace
      )
    }

    const dataList = params.namespace ? namespaceDataList : securityArray
    this.securigyGroupList = dataList
    this.isLoading = false
    return dataList
  }

  @action
  async fetchVmListStoregeClass(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/storage_classes/user`
    )
    const response = { ...params, ...this.mapper(result), kind: 'user_sces' }

    this.isLoading = false
    return response
  }

  @action
  async fetchNetworkStorage(params) {
    this.isLoading = true

    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/network_storages`
    )
    const response = {
      ...params,
      ...this.mapper(result),
      kind: 'NetworkStorage',
    }

    this.isLoading = false
    return response
  }

  @action
  async vmList(params) {
    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/vms?limit=${params.limit}`
    )
    if (params) {
      result.vms.sort((a, b) => {
        const x = a[params.sortBy]
        const y = b[params.sortBy]
        if (params.sortType === 'asc') {
          return x < y ? -1 : x > y ? 1 : 0
        }
        return x > y ? -1 : x < y ? 1 : 0
      })
    }
    return result.vms
  }

  // @action
  // async snapshotCreate(data) {
  //   const url = `${this.getResourceUrl({ cluster: data.cluster, namespace: data.namespace })}/snapshots`;

  //   const jsonData = {};
  //   jsonData.snapshot = {
  //     vm_id: data.id
  //   }

  //   const res = await request.post(url, jsonData);
  //   return res;
  // }

  @action
  async snapshotCreate(data, params = {}) {
    const url = `${this.getResourceUrl({
      cluster: params.cluster,
      namespace: params.namespace,
    })}/snapshots`

    const jsonData = {}
    const snapshotData = {}
    const project = params.project ? params.project : params.namespace

    snapshotData.vm_id = data.vmName
    snapshotData.description = data.description
    snapshotData.project = project

    jsonData.snapshot = snapshotData

    return await request.post(url, jsonData)
  }

  @action
  async snapshotList(params) {
    const project = params.project ? params.project : params.namespace
    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/vms/snapshots/${params.name}`,
      { project }
    )
    result.snapshots.sort((a, b) => {
      const x = a['timestamp']
      const y = b['timestamp']
      return x > y ? -1 : x < y ? 1 : 0
    })

    return result.snapshots
  }

  @action
  snapshotDelete({ id, ...props }) {
    const url = `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
      props
    )}/edgetron/resources/kubevirt/vms/snapshots/${id}`
    return this.submitting(request.delete(url, { project: props.project }))
  }

  @action
  async restoreCreate(data, params = {}) {
    const url = `${this.getResourceUrl(params)}/restores`

    const jsonData = {}
    const restoreData = {}

    restoreData.vm_id = params.name
    restoreData.project = params.namespace
    restoreData.snapshot_id = data.snapshotId
    restoreData.description = data.description
    jsonData.restore = restoreData

    return await request.post(url, jsonData)
  }

  @action
  async restoreList(params) {
    const project = params.project ? params.project : params.namespace
    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/vms/restores/${params.name}`,
      { project }
    )
    result.restores.sort((a, b) => {
      const x = a['timestamp']
      const y = b['timestamp']
      return x > y ? -1 : x < y ? 1 : 0
    })

    return result.restores
  }

  @action
  restoreDelete({ id, ...props }) {
    // let cluster = globals.currentCluster
    const url = `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
      props
    )}/edgetron/resources/kubevirt/vms/restores/${id}`
    return this.submitting(request.delete(url, { project: props.project }))
  }

  @action
  async cloneCreate(data, params = {}) {
    const url = `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
      params
    )}/edgetron/resources/kubevirt/vms/clones`

    const jsonData = {}
    const cloneData = {}

    cloneData.source_vm_id = data.source_vm_id
    cloneData.target_vm_id = data.target_vm_name
    cloneData.project = params.namespace
    cloneData.description = data.description

    jsonData.clone = cloneData

    return await request.post(url, jsonData)
  }

  @action
  async cloneList(params) {
    const project = params.project ? params.project : params.namespace
    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/vms/clones`,
      { project }
    )

    result.clones.sort((a, b) => {
      const x = a['timestamp']
      const y = b['timestamp']
      return x > y ? -1 : x < y ? 1 : 0
    })

    return result.clones.filter(
      item => item.source_vm_id === params.name && item.project === project
    )
  }

  @action
  cloneDelete({ id, ...props }) {
    // let cluster = globals.currentCluster
    const url = `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
      props
    )}/edgetron/resources/kubevirt/vms/clones/${id}`
    return this.submitting(request.delete(url, { project: props.project }))
  }

  @action
  async fetchVmStats(params) {
    const result = await request.get(
      `kapis/edgestack.kubesphere.io/v1alpha1${this.getPath(
        params
      )}/edgetron/resources/kubevirt/vms/stats`
    )

    return result.stat
  }

  @action
  async fetchVmsDetail({ cluster, workspace, namespace, ...params } = {}) {
    this.isLoading = true

    params.page = params.page || 1
    params.limit = params.limit || 10

    // we also can query the VMs by specifying the queried parameter to backend server
    params[params.match] = params.name

    delete params['resource']
    delete params['name']
    delete params['match']

    if (params.searchName !== '' && params.searchName !== undefined) {
      params.name = params.searchName
    }

    delete params['searchName']

    const result = await request.get(
      this.getResourceUrl({ cluster, workspace, namespace }),
      this.getFilterParams(params)
    )

    this.isLoading = false
    return result
  }
}
