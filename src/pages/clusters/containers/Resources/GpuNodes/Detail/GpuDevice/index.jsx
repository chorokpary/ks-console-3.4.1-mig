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

import React, {useState , useEffect} from 'react'
import { observer, inject } from 'mobx-react'
import { get } from 'lodash';
import { Panel } from 'components/Base'
import DetailGpuDeviceList from 'pages/clusters/containers/Resources/components/DetailGpuDeviceList';

import styles from './index.scss'

import GpuMigProfilesStore from 'stores/resources/gpumigprofiles'

const GpuDevice = (props) => {

  const store = props.detailStore
  const gpuMigProfilesStore = new GpuMigProfilesStore()

  const [gpuData, setGpuData] = useState()
  const [loading, setLoading] = useState(true)

  const gpuCount = get(store.detail, 'labels["nvidia.com/gpu.count"]', 0);

  useEffect(() => {
    fnGetData()
  }, [])

  const fnGetData = async ({ ...params } = {}) => {   
    
    setLoading(true)

    const profileName = get(store.detail, 'labels["nvidia.com/mig.config"]', '');

    const product = get(store.detail, 'labels["nvidia.com/gpu.product"]', '');
    const gpuType = (product || '').split('-')[1]

    const profileParams = { name: profileName, gpuType }
    const profileDetail = await gpuMigProfilesStore.fetchDetail(profileParams)
      
    const result = profileDetail?.result || {}

    const filteredData = {
      ...result,
      gpuType: (result.gpuType || []).filter(type => type === gpuType),
      gpuTypeDetail: (result.gpuTypeDetail || []).filter(v =>
        Object.keys(v).some(k => k.startsWith(`${gpuType}_`))
      ),
      gpuTypeSliceMemory: (result.gpuTypeSliceMemory || []).filter(v =>
        Object.keys(v).some(k => k.startsWith(`${gpuType}_`))
      )
    }    

    setGpuData(filteredData)
    setLoading(false)
  }

  const renderGpuDevices = () => {
    const cluster = props.match.params.cluster

    if (loading) return null

    if (gpuCount > 0) {
      return (
        <DetailGpuDeviceList
          gpuDeviceData={gpuData}
          cluster={cluster}
          gpuNodeData={store.detail}
        />
      )
    }else{
      return (
        <Panel title={t('RESOURCES_GPU_DEVICE')} >
          <div className={styles.wrapper}>
            <div className={styles.empty}>
                {t('RESOURCES_NO_DATA')}
            </div>
          </div>
        </Panel>
      )
    }
  };

  return (
    <>
      <div className={styles.main}>
        {renderGpuDevices()}
      </div>
    </>
  )
}

export default inject('detailStore')(observer(GpuDevice))
