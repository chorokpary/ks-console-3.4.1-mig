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

import { toJS } from 'mobx'
import { get, isEmpty, flatten, join } from 'lodash'
import { getSuitableUnit, getCustomValue } from 'utils/monitoring'

import { Panel } from 'components/Base'
import MonitorTab from 'components/Cards/Monitoring/MonitorTab'

import CustomStore from 'stores/monitoring/custom/monitor'

import styles from './index.scss'

const DetailGpuResource = props => {

    const store = props.detailStore;
    const customStore = new CustomStore()
    const gpuName = props.gpuName
    console.log("gpuName : "+ gpuName)
    const { cluster, namespace } = props

    const [fetchParams, setFetchParams] = useState({});
    const [gpuIndex, setGpuIndex] = useState();
    const [vmGpuUtilData, setVmGpuUtilData] = useState(null);
    const [vmGpuRamData, setVmGpuRamData] = useState(null);
    const [vmGpuPowerData, setVmGpuPowerData] = useState(null);
    const [vmGpuTempData, setVmGpuTempData] = useState(null);
    const [vmGpuNvlinkData, setVmGpuNvlinkData] = useState(null);
    const [vmGpuInboundData, setVmGpuInboundData] = useState(null);
    const [vmGpuOutboundData, setVmGpuOutboundData] = useState(null);

    useEffect(() => {
        fnGetData();
    }, [])

    useEffect(() => {
        if (gpuIndex !== undefined && gpuIndex !== "") {
            fetchDataGpu({ ...fetchParams });
        }
    }, [gpuIndex]); 

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

    const getTimeRange = ({ step = '180s', times = 20 } = {}) => {
        const interval = parseFloat(step) * times
        const end = Math.floor(Date.now() / 1000)
        const start = Math.floor(end - interval)
        return { start, end }
    }

    const defaultMetric = [
        {
            metric: {},
            values: [[Date.now() / 1000, 0]],
        },
    ]

    const fnGetData = async () => {
        setGpuIndex(props.gpuIndex);
    };

    const fetchDataGpu = async (params) => {
        setFetchParams(params)

        const paramsData = Object.assign({}, params, {
            start: params.start,
            end: params.end,
            step: getMinuteValue(params.step),
            times: params.times,
        });

        if (!paramsData.start || !paramsData.end) {
            const timeRange = getTimeRange(paramsData);
            paramsData.start = timeRange.start;
            paramsData.end = timeRange.end;
        }

        const getVmGpuUtilData = async () => {
            const gpuUtilDataExpr = `avg(DCGM_FI_DEV_GPU_UTIL{job="launcher-dcgm-exporter", gpu=~"${gpuIndex}", namespace="${namespace}"}) / 100`;
            const gpuUtilData = await customStore.fetchMetric({
                expr: gpuUtilDataExpr,
                ...paramsData,
                cluster: cluster,
            });
            setVmGpuUtilData(gpuUtilData)
        };

        const getVmGpuRamData = async () => {
            const gpuRamDataExpr = `avg(DCGM_FI_DEV_FB_USED{job="launcher-dcgm-exporter", gpu=~"${gpuIndex}", namespace="${namespace}"}) * 1000000`;
            const gpuRamData = await customStore.fetchMetric({
                expr: gpuRamDataExpr,
                ...paramsData,
                cluster: cluster,
            });
            setVmGpuRamData(gpuRamData)
        };

        const getVmGpuPowerData = async () => {
        const gpuPowerDataExpr = `avg(DCGM_FI_DEV_POWER_USAGE{job="launcher-dcgm-exporter", gpu=~"${gpuIndex}", namespace="${namespace}"})`;
        const gpuPowerData = await customStore.fetchMetric({
            expr: gpuPowerDataExpr,
            ...paramsData,
            cluster: cluster,
        });
            setVmGpuPowerData(gpuPowerData)
        };

        const getVmGpuTempData = async () => {
        const gpuTempDataExpr = `avg(DCGM_FI_DEV_GPU_TEMP{job="launcher-dcgm-exporter", gpu=~"${gpuIndex}", namespace="${namespace}"})`;
        const gpuTempData = await customStore.fetchMetric({
            expr: gpuTempDataExpr,
            ...paramsData,
            cluster: cluster,
        });
            setVmGpuTempData(gpuTempData)
        };

        const getVmGpuNvlinkData = async () => {
        const gpuNvlinkDataExpr = `sum(DCGM_FI_DEV_NVLINK_BANDWIDTH_TOTAL{job="launcher-dcgm-exporter", gpu=~"${gpuIndex}", namespace="${namespace}"}) * ${getCustomValue(
            'bandwidthBytes',
            'MBps'
            )}`;
        const gpuNvlinkData = await customStore.fetchMetric({
            expr: gpuNvlinkDataExpr,
            ...paramsData,
            cluster: cluster,
            });
            setVmGpuNvlinkData(gpuNvlinkData)
        };

        const getVmGpuInboundData = async () => {
        const inboundLinuxDataExpr = `sum(rate(node_infiniband_port_data_received_bytes_total{job="launcher-node-exporter", gpu=~"${gpuIndex}", namespace="${namespace}"}[2m]) * 8)`;
        const gpuInboundData = await customStore.fetchMetric({
            expr: inboundLinuxDataExpr,
            ...paramsData,
            cluster: cluster,
        });
            setVmGpuInboundData(gpuInboundData)
        };

        const getVmGpuOutboundData = async () => {
        const outboundLinuxDataExpr = `sum(rate(node_infiniband_port_data_transmitted_bytes_total{job="launcher-node-exporter", gpu=~"${gpuIndex}", namespace="${namespace}"}[2m]) * 8)`;
        const gpuOutboundData = await customStore.fetchMetric({
            expr: outboundLinuxDataExpr,
            ...paramsData,
            cluster: cluster,
        });
            setVmGpuOutboundData(gpuOutboundData)
        };

        getVmGpuUtilData();
        getVmGpuRamData();
        getVmGpuPowerData();
        getVmGpuTempData();        
        getVmGpuNvlinkData();
        getVmGpuInboundData();
        getVmGpuOutboundData();
    }

    const renderResourceStatus = () => {    
        return (
          <Panel
            className={styles.resources}
            title={t('RESOURCE_USAGE')}
            loading={vmGpuOutboundData === null}
          >
            <MonitorTab
              tabs={[
                {
                  key: 'gpucluster',
                  icon: 'ico-type-hostgpu',
                  unit: '%',
                  legend: ['RESOURCES_GPU_UTILIZATION'],
                  title: 'RESOURCES_GPU_UTILIZATION',
                  data: vmGpuUtilData?.length ? vmGpuUtilData : defaultMetric,
                },
                {
                  key: 'memory',
                  icon: 'memory',
                  unit: getSuitableUnit(flatten(vmGpuRamData?.map(result => get(result, 'values') || [])), 'memory'),
                  legend: ['RESOURCES_GPU_RAM_USAGE'],
                  title: 'RESOURCES_GPU_RAM_USAGE',
                  data: vmGpuRamData?.length ? vmGpuRamData : defaultMetric,
                },            
                {
                  key: 'temperature',
                  icon: 'ico-type-temperature',
                  unit: '°C',
                  legend: ['RESOURCES_GPU_TEMPERATURE'],
                  title: 'RESOURCES_GPU_TEMPERATURE',
                  data: vmGpuTempData?.length ? vmGpuTempData : defaultMetric,
                },
                {
                  key: 'power',
                  icon: 'ico-type-power',
                  unit: 'W',
                  legend: ['RESOURCES_GPU_POWER'],
                  title: 'RESOURCES_GPU_POWER',
                  data: vmGpuPowerData?.length ? vmGpuPowerData : defaultMetric,
                },
                {
                  key: 'inbound',
                  icon: 'ico-type-inbound',
                  type: 'bandwidth',
                  unit: getSuitableUnit(flatten(vmGpuInboundData?.map(result => get(result, 'values') || [])), 'bandwidth'),
                  legend: ['RESOURCES_GPU_IB_INBOUND'],
                  title: 'RESOURCES_GPU_IB_INBOUND',
                  data: vmGpuInboundData?.length ? vmGpuInboundData : defaultMetric,
                },
                {
                  key: 'outbound',
                  icon: 'ico-type-outbound',
                  type: 'bandwidth',
                  unit: getSuitableUnit(flatten(vmGpuOutboundData?.map(result => get(result, 'values') || [])), 'bandwidth'),
                  legend: ['RESOURCES_GPU_IB_OUTBOUND'],
                  title: 'RESOURCES_GPU_IB_OUTBOUND',
                  data: vmGpuOutboundData?.length ? vmGpuOutboundData : defaultMetric,
                },
                {
                  key: 'traffic',
                  icon: 'topology',
                  type: 'bandwidth',
                  unit: getSuitableUnit(flatten(vmGpuNvlinkData?.map(result => get(result, 'values') || [])), 'bandwidthBytes'),
                  legend: ['RESOURCES_GPU_NVLINK_TRAFFIC'],
                  title: 'RESOURCES_GPU_NVLINK_TRAFFIC',
                  data: vmGpuNvlinkData?.length ? vmGpuNvlinkData : defaultMetric,
                },
              ]}
            />
          </Panel>
        )
      }

    return (
        <div>
            {renderResourceStatus()}
        </div>   
    )
}
export default inject('detailStore', 'rootStore')(observer(DetailGpuResource))
