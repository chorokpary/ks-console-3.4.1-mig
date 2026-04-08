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
import React, { useState, useEffect } from 'react'
import { observer, inject } from 'mobx-react'

import { Panel, Text } from 'components/Base'
import { Icon, Tabs } from '@kube-design/components'
import { get, groupBy } from 'lodash'

import classnames from 'classnames'
import styles from './index.scss'

import GpuNodePodsCard from 'components/Cards/GpuNodePods'

import GpuMigProfilesStore from 'stores/resources/gpumigprofiles'

const Pod = (props) => {

    const store = props.detailStore
    const cluster = props.match.params.cluster

    const [slicePodTab, setSlicePodTab] = useState()
    const [slicePodList, setSlicePodList] = useState([])
    const { TabPanel } = Tabs

    const gpuMigProfilesStore = new GpuMigProfilesStore()

    useEffect(() => {
        const initData = async () => {
        if (!store.detail) return

            const profileName = get(store.detail, 'labels["nvidia.com/mig.config"]', '');    
            
            const product = get(store.detail, 'labels["nvidia.com/gpu.product"]', '');
            const gpuType = (product || '').split('-')[1]

            const profileParams = { name: profileName }
            const profileDetail = await gpuMigProfilesStore.fetchDetail(profileParams)

            const filteredData = {
                ...profileDetail.result,
                gpuType: profileDetail.result.gpuType.filter(type => type === gpuType),

                gpuTypeDetail: profileDetail.result.gpuTypeDetail.filter(v =>
                    Object.keys(v).some(k => k.startsWith(`${gpuType}_`))
                )
            }
            
            const gpuTypes = [
                ...new Set(
                    filteredData.gpuTypeDetail?.flatMap(item =>
                    Object.values(item).flatMap(gpu =>
                        Object.keys(gpu).map(key => key.split("_")[0])
                    )
                    )
                )
            ].sort((a, b) => {
                const aNum = parseInt(a.split("g")[0])
                const bNum = parseInt(b.split("g")[0])
                return aNum - bNum
            })
            
            setSlicePodTab(gpuTypes[0])
            setSlicePodList(gpuTypes)
        }
        initData()
    }, [])

  return (
    <>
        <Panel title={t('RESOURCES_SLICE_BY_POD_INFO')} >
            <div className={styles.wrapper}>
            {slicePodList.length == 0 &&
                <div className={styles.empty}>
                    {t('RESOURCES_NO_DATA')}
                </div>
            }
            {slicePodList.length > 0 &&
                <div className={styles.tabs}>
                    <Tabs
                    type="button"
                    activeName={slicePodTab}
                    onChange={newTab => {
                        setSlicePodTab(newTab)
                    }}
                    >
                    {slicePodList.map((obj, index) => {
                        return <TabPanel key={index} label={t(obj)} name={obj} />
                    })}
                    </Tabs>
                </div>
            }
            </div>
        </Panel>
        
        {slicePodTab && (
            <GpuNodePodsCard
                detail={store.detail}
                limit={6}
                prefix={`/clusters/${cluster}`}
                hideHeader={true}
                gpuSlice={slicePodTab}
            />
        )}
    </>
  )
}

export default inject('detailStore')(observer(Pod))
