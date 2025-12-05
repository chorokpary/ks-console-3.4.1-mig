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

import React from 'react'
import { observer, inject } from 'mobx-react'

import { Panel } from 'components/Base'
import DeploymentCard from './DeploymentCard'

import DetailGpuResource from 'pages/clusters/containers/Resources/components/DetailGpuResource'

import VmStore from 'stores/resources/vms'

import styles from './index.scss'
import { join } from 'lodash';
import { namespace } from 'd3-selection';

@inject('detailStore')
@observer
export default class Status extends React.Component {
  constructor(props) {
    super(props)

    this.store = props.detailStore
    this.vmStore = new VmStore({ cluster: this.cluster })

    this.state = {
      vmList: '',
      namespace: ''     
    }
  }

  componentDidMount() {
    this.fnGetData()
  }

  fnGetData = async () => {
    const params = {
      cluster: this.store.detail.cluster,
      limit: 10000,
    }

    const vmListData = await this.vmStore.fetchList(params)
    const project = vmListData.filter(item => item.node === this.store.detail.name)[0].project
    const vmJoinData = vmListData.filter(item => item.node === this.store.detail.name).map(item => item.name).join('|') || ''

    this.setState({ vmList: vmJoinData, namespace : project });
  }

  renderDeployments() {
    const { deploy } = this.store.detail.gpunode
    const container_toolkit = { name: "container_toolkit", flag: deploy.container_toolkit }
    const dcgm = { name: "dcgm", flag: deploy.dcgm }
    const dcgm_exporter = { name: "dcgm_exporter", flag: deploy.dcgm_exporter }
    const device_plugin = { name: "device_plugin", flag: deploy.device_plugin }
    const operator_validator = { name: "operator_validator", flag: deploy.operator_validator }
    const mig_manager = { name: "mig_manager", flag: deploy.mig_manager }
    const sandbox_device_plugin = { name: "sandbox_device_plugin", flag: deploy.sandbox_device_plugin }
    const cc_manager = { name: "cc_manager", flag: deploy.cc_manager }
    const vfio_manager = { name: "vfio_manager", flag: deploy.vfio_manager }
    const sandbox_validator = { name: "sandbox_validator", flag: deploy.sandbox_validator }
    const vgpu_manager = { name: "vgpu_manager", flag: deploy.vgpu_manager }
    const vgpu_device_manager = { name: "vgpu_device_manager", flag: deploy.vgpu_device_manager }

    return (
      <>
      <Panel title={t('RESOURCES_GPU_CONTAINER_DEPLOYMENT_STATUS')}>
        <div className={styles.deployments}>
          <DeploymentCard key="container_toolkit" data={container_toolkit} />
          <DeploymentCard key="dcgm" data={dcgm} />
          <DeploymentCard key="dcgm_exporter" data={dcgm_exporter} />
          <DeploymentCard key="device_plugin" data={device_plugin} />
          <DeploymentCard key="operator_validator" data={operator_validator} />
          <DeploymentCard key="mig_manager" data={mig_manager} />
        </div>
      </Panel>
      <Panel title={t('RESOURCES_GPU_VM_PASSTHROUGH_DEPLOYMENT_STATUS')}>
        <div className={styles.deployments}>
          <DeploymentCard key="vfio_manager" data={vfio_manager} />
          <DeploymentCard key="sandbox_device_plugin" data={sandbox_device_plugin} />
          <DeploymentCard key="sandbox_validator" data={sandbox_validator} />
        </div>
      </Panel>
      <Panel title={t('RESOURCES_GPU_VM_VGPU_DEPLOYMENT_STATUS')}>
        <div className={styles.deployments}>
          <DeploymentCard key="vgpu_manager" data={vgpu_manager} />
          <DeploymentCard key="vgpu_device_manager" data={vgpu_device_manager} />
          <DeploymentCard key="sandbox_device_plugin" data={sandbox_device_plugin} />
          <DeploymentCard key="sandbox_validator" data={sandbox_validator} />
        </div>
      </Panel>
      </>
    )
  };

  render() {
    return (
      <div className={styles.main}>
        {this.state.vmList && 
          <DetailGpuResource
            {...this.props}
            cluster={this.store.detail.cluster}
            namespace={this.state.namespace}
            vmList={this.state.vmList}
          />
        }
        {this.renderDeployments()}
      </div>
    )
  }
}

