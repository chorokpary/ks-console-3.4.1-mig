import { get, isEmpty, find, min, set } from 'lodash'
import React, { useState, useEffect } from 'react'
import { toJS } from 'mobx'
import { observer, inject } from 'mobx-react'
import classnames from 'classnames'
import { Panel } from 'components/Base'

import { getChartData, getAreaChartOps, getCustomValue } from 'utils/monitoring'
import CustomStore from 'stores/monitoring/custom/monitor'

import { Controller as MonitoringController } from 'components/Cards/Monitoring'
import { SimpleArea } from 'components/Charts'

import styles from './index.scss'
import { Button, InputSearch } from '@kube-design/components'
import vmsStore from 'stores/resources/vms'


const index = props => {
  const customStore = new CustomStore()

  const store = new vmsStore()
  const cluster = props.match.params.cluster
  const name = props.match.params.name

  const perPage = 100

  const [gpuList, setGpuList] = useState([])

  const [vmGpuUtilData, setVmGpuUtilData] = useState([])
  const [vmGpuRamData, setVmGpuRamData] = useState([])
  const [vmGpuTempData, setVmGpuTempData] = useState([])
  const [vmGpuPowerData, setVmGpuPowerData] = useState([])
  const [vmGpuNvlinkData, setVmGpuNvlinkData] = useState([])

  const [vmGpuInboundData, setVmGpuInboundData] = useState([])
  const [vmGpuOutboundData, setVmGpuOutboundData] = useState([])

  const [selectedGpu, setSelectedGpu] = useState()
  const [selectedVm, setSelectedVm] = useState()
  const [fetchParams, setFetchParams] = useState({})

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
    const page = get(params, 'page', 1)

    const detailParams = {
      cluster,
      namespace: props.detailStore.detail?.cluster,
      resource: props.variables,
      id: props.id,
      name: name,
      page: page,
      limit: perPage,
    }

    if (params.name !== '' && params.name !== undefined) {
      ;(detailParams.searchType = 'vmName'),
        (detailParams.searchName = params.name)
    }

    // const vmList = await store.fetchVmsDetail(detailParams)
    // const vmData = vmList.vmList

    // setVmDataList([vmData])
    // selectedVm ?? setSelectedVm(vmData[0]?.vmName || '')

    


    setGpuList(props.detailStore.gpuDeviceList)
    selectedGpu?? setSelectedGpu('')
  }

  const fetchData = async params => {
    setFetchParams(params)
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

    const getVmGpuUtilData = async () => {
      const gpuUtilDataExpr = `DCGM_FI_DEV_GPU_UTIL{job="launcher-dcgm-exporter", pod="${selectedVm}"} / 100`

      const vmGpuUtilData = await customStore.fetchMetric({
        expr: gpuUtilDataExpr,
        ...paramsData,
        cluster: props.match.params.cluster,
        namespace: props.detailStore.detail.cluster,
      })

      setVmGpuUtilData(vmGpuUtilData)
    }

    const getVmGpuRamData = async () => {
      const gpuRamDataExpr = `DCGM_FI_DEV_FB_USED{job="launcher-dcgm-exporter", pod="${selectedVm}"} * 1000000`

      const vmGpuRamData = await customStore.fetchMetric({
        expr: gpuRamDataExpr,
        ...paramsData,
        cluster: props.match.params.cluster,
        namespace: props.detailStore.detail.cluster,
      })

      setVmGpuRamData(vmGpuRamData)
    }

    const getVmGpuPowerData = async () => {
      const gpuPowerDataExpr = `DCGM_FI_DEV_POWER_USAGE{job="launcher-dcgm-exporter", pod="${selectedVm}"}`

      const vmGpuPowerData = await customStore.fetchMetric({
        expr: gpuPowerDataExpr,
        ...paramsData,
        cluster: props.match.params.cluster,
        namespace: props.detailStore.detail.cluster,
      })

      setVmGpuPowerData(vmGpuPowerData)
    }

    const getVmGpuTempData = async () => {
      const gpuTempDataExpr = `DCGM_FI_DEV_GPU_TEMP{job="launcher-dcgm-exporter", pod="${selectedVm}"}`

      const vmGpuTempData = await customStore.fetchMetric({
        expr: gpuTempDataExpr,
        ...paramsData,
        cluster: props.match.params.cluster,
        namespace: props.detailStore.detail.cluster,
      })

      setVmGpuTempData(vmGpuTempData)
    }

    const getVmGpuNvlinkData = async () => {
      const gpuNvlinkDataExpr = `(DCGM_FI_DEV_NVLINK_BANDWIDTH_TOTAL{job="launcher-dcgm-exporter", pod="${selectedVm}", namespace="${cluster}"}) * ${getCustomValue(
        'bandwidthBytes',
        'MBps'
      )}`
      const gpuNvlinkData = await customStore.fetchMetric({
        expr: gpuNvlinkDataExpr,
        ...paramsData,
        cluster: props.match.params.cluster,
        namespace: props.detailStore.detail.cluster,
      })
      setVmGpuNvlinkData(gpuNvlinkData)
    }

    const getVmGpuInboundData = async () => {
      const inboundLinuxDataExpr = `rate(node_infiniband_port_data_received_bytes_total{job="launcher-node-exporter", pod="${selectedVm}", namespace="${cluster}"}[2m]) * 8`
      const gpuInboundData = await customStore.fetchMetric({
        expr: inboundLinuxDataExpr,
        ...paramsData,
        cluster: props.match.params.cluster,
        namespace: props.detailStore.detail.cluster,
      })

      setVmGpuInboundData(gpuInboundData)
    }

    const getVmGpuOutboundData = async () => {
      const outboundLinuxDataExpr = `rate(node_infiniband_port_data_transmitted_bytes_total{job="launcher-node-exporter", pod="${selectedVm}", namespace="${cluster}"}[2m]) * 8`
      const gpuOutboundData = await customStore.fetchMetric({
        expr: outboundLinuxDataExpr,
        ...paramsData,
        cluster: props.match.params.cluster,
        namespace: props.detailStore.detail.cluster,
      })

      setVmGpuOutboundData(gpuOutboundData)
    }

    getVmGpuUtilData()
    getVmGpuRamData()
    getVmGpuTempData()
    getVmGpuPowerData()
    getVmGpuNvlinkData()
    getVmGpuInboundData()
    getVmGpuOutboundData()
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
      {
        type: 'utilisation',
        title: t('RESOURCES_GPU_TEMPERATURE'),
        unit: '°C',
        legend: vmGpuTempData.map(item => 'GPU' + item.metric.gpu),
        data: vmGpuTempData,
      },
      {
        type: 'utilisation',
        title: t('RESOURCES_GPU_POWER'),
        unit: 'W',
        legend: vmGpuPowerData.map(item => 'GPU' + item.metric.gpu),
        data: vmGpuPowerData,
      },
      {
        type: 'bandwidth',
        title: 'IB ' + t('RESOURCES_INBOUND'),
        unitType: 'bandwidth',
        legend: vmGpuInboundData.map(item => item.metric.device),
        data: vmGpuInboundData,
      },
      {
        type: 'bandwidth',
        title: 'IB ' + t('RESOURCES_OUTBOUND'),
        unitType: 'bandwidth',
        legend: vmGpuOutboundData.map(item => item.metric.device),
        data: vmGpuOutboundData,
      },
      {
        type: 'bandwidth',
        title: 'NVLink ' + t('TRAFFIC'),
        unitType: 'bandwidthBytes',
        legend: vmGpuNvlinkData.map(item => 'GPU' + item.metric.gpu),
        data: vmGpuNvlinkData,
      },
    ]
  }

  const handleSearch = value => {
    fnGetData({
      name: value,
    })
  }

  const renderHeader = () => {
    return (
      <div className={styles.header}>
        <InputSearch
          className={styles.search}
          name="search"
          placeholder={t('SEARCH_BY_NAME')}
          onSearch={handleSearch}
        />
      </div>
    )
  }

  useEffect(() => {
    if (selectedGpu) {
      fetchData({ ...fetchParams })
    }
  }, [selectedGpu])

  const { isLoading, isRefreshing } = customStore
  const configs = getMonitoringCfgs()

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
                    {gpuList.map((obj, idx) => (
                      <tr key={idx}>
                        <td
                          style={{
                            backgroundColor:
                              selectedGpu === 'GPU'+(obj.index+1) ? '#EEF2FF' : '',
                          }}
                          onClick={() => {
                            setSelectedGpu(`GPU${obj.index+1}`)
                          }}
                        >
                          <div
                            style={{ display: 'flex', alignItems: 'center' }}
                          >
                            <i className="ico-type-vm"></i>
                            <span style={{ marginLeft: 8 }}>{`GPU${obj.index+1}`}</span>
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
