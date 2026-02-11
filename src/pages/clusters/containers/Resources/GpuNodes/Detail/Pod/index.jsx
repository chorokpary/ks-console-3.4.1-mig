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

import PodsCard from 'components/Cards/Pods'

const Pod = (props) => {

  const store = props.detailStore
  const cluster = props.match.params.cluster

  const [isExpandFlag, setIsExpandFlag] = useState(false)
  const [expandItem, setExpandItem] = useState();

  const [slicePodTab, setSlicePodTab] = useState()
  const [slicePodList, setSlicePodList] = useState([])
  const { TabPanel } = Tabs

  useEffect(() => {
    const initData = async () => {
      if (!store.detail) return

      const slicePodOption = [ "1g.10gb", "2g.20gb", "3g.30gb", "4g.40gb"]

      setSlicePodTab('1g.10gb')
      setSlicePodList(slicePodOption)
    }
    initData()
  }, [])
  

  const renderContent = (obj) => {
      return (
          <>
              <div className={styles.content}>
                  <div className={styles.text}>
                  <div>{obj.gpu_model}</div>
                      <p>{t('RESOURCES_GPU_MODEL')}</p>
                  </div>
                  <div className={styles.text}>
                      <div>GPU-{obj.index}</div>
                      <p>{t('RESOURCES_GPU_INDEX')}</p>
                  </div>
                  <div className={styles.text}>
                      <div>{obj.memory_gib}</div>
                      <p>{t('RESOURCES_GPU_RAM')}</p>
                  </div>
                  <div className={styles.text}>
                      <div>{obj.mig ? t('RESOURCES_USE') : t('RESOURCES_NOT_USE')}</div>
                      <p>{t('RESOURCES_GPU_MIG')}</p>
                  </div>
                  {!obj.mig ? <div className={styles.text} style={{ width: '5%' }} /> :
                      <div className={styles.arrow} onClick={() => handleExpand(obj.index)}>
                          <Icon name="chevron-down" type={obj.index != expandItem ? '' : (obj.index == expandItem && isExpandFlag == false) ? '' : 'light'} size={20} />
                      </div>
                  }
              </div>
          </>
      )
  }

  const renderExtraContent = (obj) => {
    return (
        <div className={styles.itemExtra}>
            <div className={styles.containers} >
                {obj.mig &&
                    <Panel title={t('RESOURCES_GPU_MIG_SLICE')} className={styles.panelWrapper}>
                        <div className={styles.table}>
                            <table>
                                <colgroup>
                                    <col width="25%" />
                                    <col width="25%" />
                                    <col width="25%" />
                                    <col width="25%" />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th>{t('RESOURCES_GPU_MIG_SLICE_NAME')}</th>
                                        <th>{t('RESOURCES_GPU_MIG_SLICE_NUMBER')}</th>
                                        <th>{t('RESOURCES_GPU_MIG_COPY_ENGINES')}</th>
                                        <th>{t('RESOURCES_GPU_MIG_MEMORY')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(obj.mig_devices).map((item, index) => (
                                        <tr>
                                            <td>{item.name}</td>
                                            <td>{item.number}</td>
                                            <td>{item.copy_engines}</td>
                                            <td>{item.memory}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Panel>
                }
            </div>
        </div>
    )
  }

  const handleExpand = (index) => {
      setExpandItem(index);
      setIsExpandFlag(!isExpandFlag)
  }

  console.log("slicePodList : "+ JSON.stringify(slicePodList))
  return (
    <>
          <Panel title={t('RESOURCES_SLICE_BY_POD_INFO')} >
              <div className={styles.wrapper}>
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

                  {/* {(store.gpuDeviceList).map((obj, index) => {
                      return (
                          <div
                              className={classnames(styles.expandItem, "", {
                                  [styles.expanded]: (obj.index == expandItem ? isExpandFlag : false),
                              })} key={index}
                          >
                              <div className={styles.itemMain}>
                                  <div className={styles.icon}>
                                      <Icon name="gpu" size={40} type={obj.index != expandItem ? 'dark' : (obj.index == expandItem && isExpandFlag == false) ? 'dark' : 'light'} />
                                  </div>
                                  {renderContent(obj)}
                              </div>
                              {obj.mig_devices.length > 0 && renderExtraContent(obj)}
                          </div>
                      )
                  }
                  )} */}
              </div>
          </Panel>

          <PodsCard
            detail={store.detail}
            limit={6}
            prefix={`/clusters/${cluster}`}
        />
    </>
  )
}

export default inject('detailStore')(observer(Pod))
