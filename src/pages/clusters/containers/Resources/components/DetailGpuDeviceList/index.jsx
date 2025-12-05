import { get, groupBy } from 'lodash'
import React, { useState, useEffect } from 'react'
import { observer, inject } from 'mobx-react'
import classnames from 'classnames'

import { Panel, Text } from 'components/Base'
import { Icon } from '@kube-design/components'
import styles from './index.scss'
import { Link } from 'react-router-dom'

import * as common from 'utils/resources'

const DetailGpuDeviceList = (props) => {

    const [isExpandFlag, setIsExpandFlag] = useState(false)
    const [expandItem, setExpandItem] = useState();

    const cluster = props.cluster;

    const sliceSampleData = [
        {
            "B200_1":{
            "1g.23gb":2,
            "2g.45gb":1,
            "3g.90gb":1
            }
         }
    ]

    const [sliceSmCount, setSliceSmCount] = useState(7)
    const [sliceMemory, setSliceMemory] = useState(180)

    
    const MIGGpuTypeSlice = ({ gpuName, devices }) => {
        const sliceArray = []
        Object.entries(devices).forEach(([key, count]) => {
        const [gStr, memoryStr] = key.split('.')
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
                    <strong>{addMemory}</strong>/<small>{sliceMemory} GB</small>
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

    const sortByGpuKey = list => {
        return list.sort((a, b) => {
        const keyA = Object.keys(a)[0]
        const keyB = Object.keys(b)[0]

        const numA = Number(keyA.split('_')[1])
        const numB = Number(keyB.split('_')[1])

        return numA - numB
        })
    }


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
                    <div className={styles.text} style={{ width: '5%' }} /> :
                        <div className={styles.arrow} onClick={() => handleExpand(obj.index)}>
                            <Icon name="chevron-down" type={obj.index != expandItem ? '' : (obj.index == expandItem && isExpandFlag == false) ? '' : 'light'} size={20} />
                    </div>                    
                </div>
            </>
        )
    }

    const renderExtraContent = (obj) => {

        return (
            <div className={styles.itemExtra}>
                <div className={styles.containers} >
                    <Panel title={t('RESOURCES_GPU_MIG_SLICE')} className={styles.panelWrapper}>
                        <div className={styles.table}>
                            <div className="gpu_mig_container mig_profile_view">
                                {
                                    sortByGpuKey(sliceSampleData).map((item, index) => {

                                        const key = Object.keys(item)[0]+"_"+index
                                        const devices = Object.values(item)[0]
                                        const num = String(key.split('_')[1]).padStart(2, '0')
                                        const gpuName = num == 'all' ? 'ALL' : `GPU${num}`        
                                    
                                        return (             
                                            <MIGGpuTypeSlice
                                                key={key}
                                                gpuName={gpuName}
                                                devices={devices}
                                            />                  
                                        )
                                    })
                                    }
                            </div>
                        </div>
                    </Panel>
                </div>
            </div>
        )

        //   return (
        //     <div className={styles.itemExtra}>
        //         <div className={styles.containers} >
        //             {obj.mig &&
        //                 <Panel title={t('RESOURCES_GPU_MIG_SLICE')} className={styles.panelWrapper}>
        //                     <div className={styles.table}>
        //                         <table>
        //                             <colgroup>
        //                                 <col width="25%" />
        //                                 <col width="25%" />
        //                                 <col width="25%" />
        //                                 <col width="25%" />
        //                             </colgroup>
        //                             <thead>
        //                                 <tr>
        //                                     <th>{t('RESOURCES_GPU_MIG_SLICE_NAME')}</th>
        //                                     <th>{t('RESOURCES_GPU_MIG_SLICE_NUMBER')}</th>
        //                                     <th>{t('RESOURCES_GPU_MIG_COPY_ENGINES')}</th>
        //                                     <th>{t('RESOURCES_GPU_MIG_MEMORY')}</th>
        //                                 </tr>
        //                             </thead>
        //                             <tbody>
        //                                 {(obj.mig_devices).map((item, index) => (
        //                                     <tr>
        //                                         <td>{item.name}</td>
        //                                         <td>{item.number}</td>
        //                                         <td>{item.copy_engines}</td>
        //                                         <td>{item.memory}</td>
        //                                     </tr>
        //                                 ))}
        //                             </tbody>
        //                         </table>
        //                     </div>
        //                 </Panel>
        //             }
        //         </div>
        //     </div>
        // )
    }

    const handleExpand = (index) => {
        setExpandItem(index);
        setIsExpandFlag(!isExpandFlag)
    }

    return (
        <>
            <Panel title={t('RESOURCES_GPU_DEVICE')} >
                <div className={styles.wrapper}>
                    {(props.gpuDeviceData).map((obj, index) => {
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
                                {/* {obj.mig_devices.length > 0 && renderExtraContent(obj)} */}
                                {renderExtraContent(obj)}
                            </div>
                        )
                    }
                    )}
                </div>
            </Panel>
        </>
    );
};

export default DetailGpuDeviceList
