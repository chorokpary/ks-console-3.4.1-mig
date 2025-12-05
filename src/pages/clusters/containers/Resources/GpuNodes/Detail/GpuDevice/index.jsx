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
import DetailGpuDeviceList from 'pages/clusters/containers/Resources/components/DetailGpuDeviceList';

import styles from './index.scss'

const GpuDevice = (props) => {
  const store = props.detailStore

  const renderGpuDevices = () => {
    const cluster = props.match.params.cluster
    if (store.detail.gpunode.count > 0) {
      return (
        <DetailGpuDeviceList
          gpuDeviceData={store.gpuDeviceList}
          cluster={cluster}
        />
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
