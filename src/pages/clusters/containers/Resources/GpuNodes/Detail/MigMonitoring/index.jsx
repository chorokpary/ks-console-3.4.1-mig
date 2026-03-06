import React, { useState, useEffect } from 'react'
import { observer, inject } from 'mobx-react'
import { get, isEmpty } from 'lodash'

import { getChartData, getAreaChartOps } from 'utils/monitoring'

import { Controller as MonitoringController } from 'components/Cards/Monitoring'
import { SimpleArea } from 'components/Charts'
import CustomTooltip from 'components/Charts/Custom/Tooltip'

import CustomStore from 'stores/monitoring/custom/monitor'
import NodeMonitorStore from 'stores/monitoring/node'
import GpuMigProfilesStore from 'stores/resources/gpumigprofiles'

import { Panel } from 'components/Base'
import styles from './index.scss'
import { Button, InputSearch } from '@kube-design/components'

const index = props => {

  const MetricTypes = {
    cpu_utilisation: 'node_cpu_utilisation',
    memory_utilisation: 'node_memory_utilisation',
  }

  const store = props.detailStore
  const cluster = props.match.params.cluster
  const name = props.match.params.name

  const customStore = new CustomStore()
  const monitorStore = new NodeMonitorStore({ cluster: cluster })
  const gpuMigProfilesStore = new GpuMigProfilesStore()

  const [gpuList, setGpuList] = useState([])
  const [selectedGpu, setSelectedGpu] = useState()  
  const [fetchParams, setFetchParams] = useState({})

   const [metrics, setMetrics] = useState()

  useEffect(() => {
    fnGetData()
  }, [])

  const fnGetData = async ({ ...params } = {}) => {   
    const isMigApply = get(store.detail, 'labels["nvidia.com/mig.config"]') === 'all-disabled';
    const profileName = get(store.detail, 'labels["nvidia.com/mig.config"]', '');

    const profileParams = { name: profileName }
    const profileDetail = await gpuMigProfilesStore.fetchDetail(profileParams)
   
    setGpuList(profileDetail.result?.gpuCount)

    console.log("profileDetail.result?.gpuCount  : "+ JSON.stringify(profileDetail.result?.gpuCount) )
    profileDetail.result?.gpuCount.length > 0 && setSelectedGpu(`GPU${profileDetail.result?.gpuCount[0]+1}`)

  }

  const fetchData = async params => {
    setFetchParams(params)
    const { name, role = [] } = store.detail
    
    const fetchMetricData =  await monitorStore.fetchMetrics({
      resources: [name],
      metrics: Object.values(MetricTypes),
      fillZero: !role.includes('edge'),
      ...params,
    })

    setMetrics(fetchMetricData)
  }

  const getMonitoringCfgs = () => {
    return [
      {
        type: 'utilisation',
        title: 'CPU_USAGE',
        unit: '%',
        legend: ['CPU_USAGE'],
        data: get(metrics, `${MetricTypes.cpu_utilisation}.data.result`),
      },
      {
        type: 'utilisation',
        title: 'MEMORY_USAGE',
        unit: '%',
        legend: ['MEMORY_USAGE'],
        data: get(
          metrics,
          `${MetricTypes.memory_utilisation}.data.result`
        ),
      },
    ]
  }

  useEffect(() => {
    if (selectedGpu) {
      fetchData({ ...fetchParams })
    }
  }, [selectedGpu])

  const { createTime } = store.detail
  const { isLoading, isRefreshing } = monitorStore
  const configs = getMonitoringCfgs()

  return (
    <MonitoringController
      title={t('RESOURCES_GPU_MONITORING')}
      onFetch={fetchData}
      loading={isLoading}
      refreshing={isRefreshing}
      createTime={createTime}
      //isEmpty={isEmpty(metrics)}
    >
      {/* todo - 화면 분리 */}
      <div style={{ display: 'flex' }}>
        <div
          style={{
            flex: 1,
            paddingRight: '20px',
          }}
        >
          <Panel>
            <div style={{ height: '630px'}}>
              <div className={styles.content}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t('GPU')}</th>
                    </tr>
                  </thead>
                  <tbody className={styles.vm_list}>
                    {gpuList.length > 0 && gpuList.map((item) => (
                      <tr key={item}>
                        <td
                          style={{
                            backgroundColor:
                              selectedGpu === 'GPU'+(item+1) ? '#EEF2FF' : '',
                          }}
                          onClick={() => {
                            setSelectedGpu(`GPU${item+1}`)
                          }}
                        >
                          <div
                            style={{ display: 'flex', alignItems: 'center' }}
                          >
                            <i className="ico-type-vm"></i>
                            <span style={{ marginLeft: 8 }}>{`GPU${String(item+1).padStart(2, '0')}`}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
        </div>

        <div
          style={{
            flex: 4,
            overflow: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {configs.map((item, idx) => {
            const config = getAreaChartOps(item)
            if (isEmpty(config.data)) return null
            return (
              <div key={config.title} style={{ marginBottom: '10px' }}>
                <SimpleArea {...config} />
              </div>
            )
          })}
        </div>
      </div>
    </MonitoringController>
  )
}

export default inject('detailStore')(observer(index))
