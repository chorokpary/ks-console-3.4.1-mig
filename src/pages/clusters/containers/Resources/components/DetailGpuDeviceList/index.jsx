import { get, groupBy } from 'lodash'
import React, { useState, useEffect } from 'react'
import { observer, inject } from 'mobx-react'
import classnames from 'classnames'

import { Panel, Text } from 'components/Base'
import { Icon } from '@kube-design/components'
import styles from './index.scss'
import { Link } from 'react-router-dom'

import * as common from 'utils/resources'

import { getNodeStatus } from 'utils/node'
import { getValueByUnit } from 'utils/monitoring'

import NodeMonitoringStore from 'stores/monitoring/node'

const DetailGpuDeviceList = (props) => {

    const [expandedItems, setExpandedItems] = useState([]);

    const cluster = props.cluster;

    const monitoringStore = new NodeMonitoringStore({ cluster: cluster })  

    const migProfileData = props.gpuDeviceData
    const gpuNodeData = props.gpuNodeData

    const [loading, setLoading] = useState(true)

    const [gpuData, setGpuData] = useState({})
    const [sliceSmCount, setSliceSmCount] = useState(0)
    const [sliceMemory, setSliceMemory] = useState(0)

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

        const getNodeData = async () => {
            if (!gpuNodeData) return

            const statusStr = getNodeStatus(gpuNodeData)  
            const metrics = getRecordMetrics(gpuNodeData, metricField)
            setGpuData({
                name: gpuNodeData.name,
                product: get(gpuNodeData, ['labels', 'nvidia.com/gpu.product'], ''),
                count: get(gpuNodeData, ['labels', 'nvidia.com/gpu.count'], 0),
                memory: `${metrics.memory_used} / ${metrics.memory_total} GiB`,
                status: statusStr,
                mig: !(get(gpuNodeData, ['labels', 'nvidia.com/mig.config']) === 'all-disabled')
            })
        }

        const getProfileData = async () => {
            if (!migProfileData) return

            setSliceSmCount(migProfileData.totalSmCount / migProfileData.gpuCount.length)
            setSliceMemory(migProfileData.totalMemory / migProfileData.gpuCount.length)
            setLoading(false)
        }

        getNodeData()
        getProfileData()

    }, [])
    
    const MIGGpuTypeSlice = ({ gpuName, devices }) => {
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

        const sliceCount = Object.keys(devices).length

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
                        <strong>{addMemory}</strong>/<small>{sliceMemory} GB</small>
                    </span>
                </div>
                <div className="status_item">
                    <span className="label">Slice</span>
                    <span className="number">
                        <strong>{sliceCount}</strong>
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
                    key={`${gpuName}_${index}`}
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

    const renderContent = (obj, index) => {

        return (
            <>
                <div className={styles.content}>
                    <div className={styles.text}>
                    <div>{obj.product}</div>
                        <p>{t('RESOURCES_GPU_MODEL')}</p>
                    </div>
                    <div className={styles.text}>
                        <div>GPU-{index}</div>
                        <p>{t('RESOURCES_GPU_INDEX')}</p>
                    </div>
                    <div className={styles.text}>
                        <div>{obj.memory}</div>
                        <p>{t('RESOURCES_GPU_RAM')}</p>
                    </div>
                    <div className={styles.text}>
                        <div>{obj.mig ? t('RESOURCES_USE') : t('RESOURCES_NOT_USE')}</div>
                        <p>{t('RESOURCES_GPU_MIG')}</p>
                    </div>
                    {!obj.mig ? <div className={styles.text} style={{ width: '5%' }} /> :
                        <div className={styles.arrow} onClick={() => handleExpand(index)}>
                            <Icon name="chevron-down" type={expandedItems.includes(index) ? 'light' : ''} size={20} />
                        </div>
                    }
                </div>
            </>
        )
    }

    const renderExtraContent = (obj) => {

        const key = Object.keys(obj)[0]
        const devices = Object.values(obj)[0]
        const num = String(key.split('_')[1]).padStart(2, '0')
        const gpuName = num == 'all' ? 'ALL' : `GPU${num}`    

        return (
            <div className={styles.itemExtra}>
                <div className={styles.containers} >
                    <p>{t('RESOURCES_GPU_MIG_SLICE')}</p>
                    <div className="gpu_mig_container mig_profile_view">          
                        <MIGGpuTypeSlice key={key} gpuName={gpuName} devices={devices}/>  
                    </div>
                </div>
            </div>
        )
    }

    const handleExpand = (index) => {
        setExpandedItems(prev => {
            if (prev.includes(index)) {
                return prev.filter(i => i !== index);
            } else {
                return [...prev, index];
            }
        });
    };

    const openAll = () => {
        const allIndexes = Array.from(
            { length: gpuData.count },
            (_, index) => index
        );
        setExpandedItems(allIndexes);
    };

    const closeAll = () => {
        setExpandedItems([]);
    };

    return (
        <>
            <Panel title={t('RESOURCES_GPU_DEVICE')} >
                <div className={styles.wrapper}>
                    <div className={styles.right}>
                        <button id="closeAll" onClick={() => closeAll()}>
                        <i className="ico-fold-all"></i>
                        </button>
                        <button id="openAll" onClick={() => openAll()}>
                        <i className="ico-fold-unfold-all"></i>
                        </button>
                    </div>
                    {Array.from({ length: gpuData.count}).map((_, index) => {
                        const obj = migProfileData.gpuTypeDetail[index]
                        return (
                            <div
                                className={classnames(styles.expandItem, "", {
                                    [styles.expanded]: expandedItems.includes(index),
                                })} key={index}
                            >
                                <div className={styles.itemMain}>
                                    <div className={styles.icon}>
                                        <Icon name="nodes" size={40} type={expandedItems.includes(index) ? 'light' : ''} />
                                    </div>
                                    {renderContent(gpuData, index)}
                                </div>
                                {renderExtraContent(obj)}
                            </div>
                        )
                    })}
                </div>
            </Panel>
        </>
    );
};

export default DetailGpuDeviceList
