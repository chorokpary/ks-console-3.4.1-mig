import { get, groupBy, join } from 'lodash'
import React, { useState, useEffect } from 'react'
import { toJS } from 'mobx'
import { Loading, Icon, Button, Notify } from '@kube-design/components'
import { observer, inject } from 'mobx-react'

import classnames from 'classnames'

import { Link } from 'react-router-dom'
import { Panel, Status, Text, Indicator } from 'components/Base'

import styles from './index.scss'

import { getNodeStatus } from 'utils/node'
import { getValueByUnit } from 'utils/monitoring'

import NodeMonitoringStore from 'stores/monitoring/node'
import GpuNodeStore from 'stores/resources/gpunodes';

const GpuNode = props => {

  const { cluster, name } = props.match.params

  const store = props.detailStore
  const gpuNodeStore = new GpuNodeStore();
  const monitoringStore = new NodeMonitoringStore({ cluster: cluster })

  const [loading, setLoading] = useState(true)
  const [gpuNodeList, setGpuNodeList] = useState([])  

  const MetricTypes = {
    memory_used: 'node_memory_usage_wo_cache',
    memory_total: 'node_memory_total',
    memory_utilisation: 'node_memory_utilisation',
  }

  const metricField = [
            {
              type: 'memory_used',
              unit: 'Gi',
            },
            {
              type: 'memory_total',
              unit: 'Gi',
            },
            {
              type: 'memory_utilisation',
            },
      ]

  const getLastValue = (node, type, unit) => {
    const metricsData = monitoringStore.data
    const result = get(metricsData[type], 'data.result') || []
    const metrics = result.find(item => get(item, 'metric.node') === node.name)
    return getValueByUnit(get(metrics, 'value[1]', 0), unit)
  }

  const getRecordMetrics = (record, configs) => {
    const metrics = {}
    configs.forEach(cfg => {
      metrics[cfg.type] = parseFloat(
        getLastValue(record, MetricTypes[cfg.type], cfg.unit)
      )
    })
    return metrics
  }

  // 초기 데이터 처리
  useEffect(() => {
    if (!store.detail) return
    setLoading(false)
  }, [])

  useEffect(() => {
    const getGpuNodeData = async () => {
      const result = await gpuNodeStore.fetchList()
      const gpuDataList = await result.filter(item => item.labels['nvidia.com/mig.config'] === name)
                                      .map((item) => {
                                        const statusStr = getNodeStatus(item)  
                                        const metrics = getRecordMetrics(item, metricField)
                                        return {
                                          name: item.name,
                                          type: item.gpu_product.split('-')[1],
                                          count: item.gpu_count,
                                          memory: `${metrics.memory_used} / ${metrics.memory_total} GiB`,
                                          status: statusStr,
                                        }
                                      })
      setGpuNodeList(gpuDataList)
    }
    getGpuNodeData();
  }, [])

  // 로딩 중이면 스피너나 로딩 메시지
  if (loading) {
    return <Loading className="ks-page-loading" />
  }

  return (
    <>
      <div>
        <Panel title={t('RESOURCES_GPU_NODE_IN_USE')}>
          <div className={styles.wrapper}>

            {gpuNodeList?.length === 0 && (
                <div className={styles.empty}>
                    {t('RESOURCES_NO_DATA')}
                </div>
            )}

            {gpuNodeList?.length > 0 && gpuNodeList.map((obj, index) => {
              return (
                <div className={classnames(styles.itemNode)} key={index}>
                  <div className={styles.icon}>
                    <Icon name="nodes" size={40} />
                  </div>
                  <div className={classnames(styles.title, styles.name)}>
                    <div>{obj.name}</div>
                    <p>{t('RESOURCES_GPU_NODE')}</p>
                  </div>
                  <div className={styles.title}>
                    <div>{obj.type}</div>
                    <p>{t('RESOURCES_GPU_TYPE')}</p>
                  </div>
                  <div className={styles.title}>
                    <div>{obj.count}</div>
                    <p>{t('RESOURCES_GPU_COUNT')}</p>
                  </div>
                  <div className={styles.title}>
                    <div>{obj.memory}</div>
                    <p>{t('RESOURCES_GPU_RAM')}</p>
                  </div>
                  <div className={styles.title}>
                    <div>
                      <Status
                        type={obj.status}
                        name={t(`NODE_STATUS_${obj.status.toUpperCase()}`)}
                      />
                    </div>
                    <p>{t('RESOURCES_STATE')}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>
    </>
  )
}

export default inject('detailStore')(observer(GpuNode))
