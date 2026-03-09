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
  const gpuName = props.match.params.name

  const customStore = new CustomStore()
  const monitorStore = new NodeMonitorStore({ cluster: cluster })
  const gpuMigProfilesStore = new GpuMigProfilesStore()

  const [gpuList, setGpuList] = useState([])
  const [selectedGpu, setSelectedGpu] = useState()  
  const [fetchParams, setFetchParams] = useState({})

  const [vmGpuUtilData, setVmGpuUtilData] = useState([])
  const [vmGpuRamData, setVmGpuRamData] = useState([])

  const getMinuteValue = (timeStr = '60s', hasUnit = true) => {
    const unit = timeStr.slice(-1)
    let value = parseFloat(timeStr)

    switch (unit) {
      default:
      case 's':
        break
      case 'm':
        value *= 60
        break
      case 'h':
        value *= 60 * 60
        break
      case 'd':
        value = value * 24 * 60 * 60
        break
    }
    return hasUnit ? `${value}s` : value
  }

  const getTimeRange = ({ step = '600s', times = 20 } = {}) => {
    const interval = parseFloat(step) * times
    const end = Math.floor(Date.now() / 1000)
    const start = Math.floor(end - interval)

    return { start, end }
  }

  useEffect(() => {
    fnGetData()
  }, [])

  const fnGetData = async ({ ...params } = {}) => {   
    const isMigApply = get(store.detail, 'labels["nvidia.com/mig.config"]') === 'all-disabled';
    const profileName = get(store.detail, 'labels["nvidia.com/mig.config"]', '');

    const profileParams = { name: profileName }
    const profileDetail = await gpuMigProfilesStore.fetchDetail(profileParams)
   
   setGpuList(Array.isArray(profileDetail.result?.gpuCount) 
      ? profileDetail.result.gpuCount 
      : []
    )

    profileDetail.result?.gpuCount.length > 0 && setSelectedGpu(`GPU${profileDetail.result?.gpuCount[0]+1}`)

  }

  const fetchData = async params => {
    
    const paramsData = Object.assign(params, {
      start: params.start,
      end: params.end,
      step: getMinuteValue(params.step),
      times: params.times,
    })

    if (!paramsData.start || !paramsData.end) {
      const timeRange = getTimeRange(paramsData)
      paramsData.start = timeRange.start
      paramsData.end = timeRange.end
    }

    const metricGpu = Number((selectedGpu || "GPU1").replace("GPU", "")) - 1
    console.log("metricGpu : "+ metricGpu)

    const getVmGpuUtilData = async () => {
      const gpuUtilDataExpr = `avg by (gpu) (DCGM_FI_DEV_GPU_UTIL{job="nvidia-dcgm-exporter", gpu="${metricGpu}", Hostname="${gpuName}"}) / 100`
      console.log("gpuUtilDataExpr : "+ gpuUtilDataExpr)
      const gpuUtilData = await customStore.fetchMetric({
        expr: gpuUtilDataExpr,
        ...paramsData,
        cluster: props.match.params.cluster,
      })

      setVmGpuUtilData(gpuUtilData)
    }

    const getVmGpuRamData = async () => {
      const gpuRamDataExpr = `avg by (gpu)(DCGM_FI_DEV_FB_USED{job="nvidia-dcgm-exporter", gpu="${metricGpu}", Hostname="${gpuName}"}) * 1000000`
      console.log("gpuRamDataExpr : "+ gpuRamDataExpr)
      const gpuRamData = await customStore.fetchMetric({
        expr: gpuRamDataExpr,
        ...paramsData,
        cluster: props.match.params.cluster,
      })

      setVmGpuRamData(gpuRamData)
    }

    getVmGpuUtilData()
    getVmGpuRamData()
  }

  const getMonitoringCfgs = () => {
    return [
      {
        type: 'utilisation',
        title: 'RESOURCES_GPU_UTILIZATION',
        unit: '%',
        legend: vmGpuUtilData.map(item => 'GPU' + item.metric.gpu),
        data: vmGpuUtilData,
      },
      {
        type: 'utilisation',
        title: 'RESOURCES_GPU_RAM_USAGE',
        unit: '%',
        unitType: 'memory',
        legend: vmGpuRamData.map(item => 'GPU' + item.metric.gpu),
        data: vmGpuRamData,
      },
    ]
  }


  useEffect(() => {
    // if (selectedGpu) {
    //   fetchData({ ...fetchParams })
    // }
  }, [selectedGpu])

  const { isLoading, isRefreshing } = monitorStore
  const configs = getMonitoringCfgs()

  console.log("selectedGpu : "+ selectedGpu)
  return (
    <MonitoringController
      title={t('RESOURCES_GPU_MONITORING')}
      onFetch={fetchData}
      loading={isLoading}
      refreshing={isRefreshing}
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
                    {gpuList.length == 0 &&
                       <tr>
                          <td>{t('RESOURCES_NO_DATA')}</td>
                      </tr>
                    }
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
            console.log("config : "+ JSON.stringify(config))
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
