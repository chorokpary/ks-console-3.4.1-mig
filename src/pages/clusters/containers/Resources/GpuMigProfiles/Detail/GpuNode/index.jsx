import { get, groupBy, join } from 'lodash'
import React, { useState, useEffect } from 'react'
import { toJS } from 'mobx'
import { Loading, Icon, Button, Notify } from '@kube-design/components'
import { observer, inject } from 'mobx-react'

import classnames from 'classnames'

import { Link } from 'react-router-dom'
import { Panel, Status, Text, Indicator } from 'components/Base'

import styles from './index.scss'

const GpuNode = props => {
  const store = props.detailStore

  const { cluster } = props.match.params

  const [loading, setLoading] = useState(true)

  const nodeDataList = [
    {
      name: 'H100_node1',
      type: 'H100',
      count: '8',
      memory: '80 / 640 Gi',
      status: 'Running',
    },
    {
      name: 'H100_node2',
      type: 'H100',
      count: '8',
      memory: '80 / 640 Gi',
      status: 'Warning',
    },
    {
      name: 'H100_node3',
      type: 'H100',
      count: '8',
      memory: '80 / 640 Gi',
      status: 'Running',
    },
  ]

  // 초기 데이터 처리
  useEffect(() => {
    if (!store.detail) return
    setLoading(false)
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
            {nodeDataList.map((obj, index) => {
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
                    <div>{'80 / 640 Gi'}</div>
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
