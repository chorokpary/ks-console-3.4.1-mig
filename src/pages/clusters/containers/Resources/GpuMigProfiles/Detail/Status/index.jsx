import { get, groupBy, join } from 'lodash'
import React, { useState, useEffect } from 'react'
import { toJS } from 'mobx'
import { Loading, Tabs, Icon, Button, Notify } from '@kube-design/components'
import { observer, inject } from 'mobx-react'

import classnames from 'classnames'

import { Link } from 'react-router-dom'
import { Panel, Text, Indicator } from 'components/Base'

import styles from './index.scss'

const Status = props => {
  const store = props.detailStore
  const { cluster } = props.match.params

  const detailData = store.detail.result

  const [loading, setLoading] = useState(true)

  const [gpuTypeList, setGpuTypeList] = useState([])
  const [storageClassTab, setStorageClassTab] = useState()

  const { TabPanel } = Tabs

  const [sliceSmCount, setSliceSmCount] = useState(0)

  // 초기 데이터 처리
  useEffect(() => {
    const initData = async () => {
      if (!store.detail) return

      const gpuTypeOption = await detailData.gpuType.map(item => item)

      setGpuTypeList(gpuTypeOption)
      setStorageClassTab(gpuTypeOption[0])
      setSliceSmCount(detailData.totalSmCount / detailData.gpuCount.length)
      setLoading(false)
    }
    initData()
  }, [])

  // 로딩 중이면 스피너나 로딩 메시지
  if (loading) {
    return <Loading className="ks-page-loading" />
  }

  const MIGGpuTypeSlice = ({ gpuName, devices, memory }) => {
    const sliceArray = []
    Object.entries(devices ?? {}).forEach(([key, count]) => {
      const [gStr, memoryStr] = key.replace(/_\d+$/, '').split('.')
      const g = parseInt(gStr.replace('g', ''), 10)
      for (let i = 0; i < count; i++) {
        sliceArray.push(`${g}g.${memoryStr}`)
      }
    })

    let addCount = 0
    let addMemory = 0

    sliceArray.forEach(item => {
      const [gPart, memPart] = item.split('.')
      addCount += parseInt(gPart.replace('g', ''), 10)
      addMemory += parseInt(memPart.replace('gb', ''), 10)
    })

    return (
      <section className="gpu_mig_box">
        <header className="gpu_mig_header">
          <h2 className="gpu_mig_gpu_title">{gpuName}</h2>
          <nav className="gpu_mig_status">
            <div className="status_item">
              <span className="label">SM</span>
              <span className="number">
                <strong>{addCount}</strong>/<small>{sliceSmCount}</small>
              </span>
            </div>
            <div className="status_item">
              <span className="label">{t('MEMORY')}</span>
              <span className="number">
                <strong>{addMemory}</strong>/<small>{memory} GB</small>
              </span>
            </div>
          </nav>
        </header>
        <ul className="mig_bar_chart">
          {sliceArray.map((item, index) => {
            const parts = item.split('.')
            const value = parts[0] || item
            return (
              <li
                key={`${storageClassTab}_${gpuName}_${index}`}
                className={`profile p_${value}`}
              >
                <div>
                  <span>{item}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  const sortByGpuKey = list => {
    return list.sort((a, b) => {
      const keyA = Object.keys(a)[0]
      const keyB = Object.keys(b)[0]

      const numA = Number(keyA.split('_')[1])
      const numB = Number(keyB.split('_')[1])

      return numA - numB
    })
  }

  return (
    <>
      <div>
        <Panel title={t('RESOURCES_MIG_PROFILE')}>
            <Tabs
              type="button"
              activeName={storageClassTab}
              onChange={newTab => {
                setStorageClassTab(newTab)
              }}
            >
              {gpuTypeList.map((obj, index) => {
                return <TabPanel key={index} label={t(obj)} name={obj} />
              })}
            </Tabs>
            
            <div className="gpu_mig_container mig_profile_view">
              {
                sortByGpuKey(detailData.gpuTypeDetail.filter(item => {                  
                  return Object.keys(item)[0].split("_")[0] === storageClassTab;
                })).map((item, index) => {

                    const key = Object.keys(item)[0]+"_"+index
                    const devices = Object.values(item)[0]
                    const num = String(key.split('_')[1]).padStart(2, '0')
                    const gpuName = num == 'all' ? 'ALL' : `GPU${num}`        

                    const memory = detailData.gpuTypeSliceMemory
                                  .filter(o => Object.keys(o)[0].startsWith(`${storageClassTab}_`))
                                  .flatMap(o => Object.values(o))[0]
                    return (             
                      <MIGGpuTypeSlice
                        key={key}
                        gpuName={gpuName}
                        devices={devices}
                        memory={memory}
                      />                  
                    )
                  })
                }
            </div>
        </Panel>
      </div>
    </>
  )
}

export default inject('detailStore')(observer(Status))
