/*
 * This file is part of KubeSphere Console.
 * Copyright (C) 2019 The KubeSphere Console Authors.
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

import React from 'react'
import { Link } from 'react-router-dom'
import { toJS } from 'mobx'

import ResourceTable from 'clusters/components/ResourceTable'
import { Avatar, Status, Indicator } from 'components/Base'
import { Tooltip, Icon } from '@kube-design/components'
import Banner from 'components/Cards/Banner'
import withList, { ListPage, withClusterList } from 'components/HOCs/withList'
import Table from 'components/Tables/List'
import { getLocalTime } from 'utils'
import { ICON_TYPES } from 'utils/constants'

import GpuMigProfilesStore from 'stores/resources/gpumigprofiles'

import { namespace } from 'd3-selection'
import styles from './index.scss'

@withClusterList({
  store: new GpuMigProfilesStore(),
  module: 'gpumigprofiles',
  authKey: 'gpumigprofiles',
  name: t('RESOURCES_GPU_CLUSTER'),
})
export default class gpumigprofiles extends React.Component {
  // GPU catalog create start ##################################
  constructor(props) {
    super(props)
    this.state = {
      catalogData: null,
      loading: true,
    }
  }

  componentDidMount() {
    // 페이지 로드 후 최초 1회 실행
    this.loadGpuCatalog()
  }

  loadGpuCatalog = async () => {
    try {
      const res = await request.post('/gpucatalog')
      this.setState({ catalogData: res, loading: false })
    } catch (err) {
      console.error('Error loading gpu catalog:', err)
      this.setState({ loading: false })
    }
  }
  // GPU catalog create end ##################################

  showAction(record) {
    return globals.user.username !== record.name
  }

  get itemActions() {
    const { getData, trigger } = this.props

    return [
      {
        key: 'delete',
        icon: 'trash',
        text: t('RESOURCES_DELETE'),
        action: 'delete',
        show: item => {
          if (item.name === 'all-balanced') return false
          return this.showAction(item)
        },
        onClick: item =>
          trigger('gpumigprofiles.remove', {
            detail: item,
            namespace: item.namespace,
            success: () => {
              setTimeout(() => {
                getData()
              }, 200)
            },
            ...this.props.match.params,
          }),
      },
    ]
  }

  get tableActions() {
    const { trigger, getData, routing, tableProps } = this.props
     
    return {
      ...tableProps.tableActions,
      actions: [
        {
          key: 'regist',
          type: 'control',
          text: t('RESOURCES_CREATE'),
          action: 'create',
          onClick: () =>
            trigger('gpumigprofiles.regist', {
              ...this.props.match.params,
              type: this.name,
              rootStore: this.props.rootStore,
              success: getData,
            }),
        },
      ],
      selectActions: [
        // {
        //   key: 'delete',
        //   type: 'danger',
        //   text: t('RESOURCES_DELETE'),
        //   action: 'delete',
        //   onClick: () =>
        //     trigger('gpumigprofiles.remove.batch', {
        //       success: getData,
        //       ...this.props.match.params,
        //     }),
        // },
      ],
      // getCheckboxProps: record => ({
      //   disabled: !this.showAction(record),
      //   name: record.name,
      // }),
    }
  }

  getStateType() {
    const STATE_TYPE = [
      { text: 'Normal', value: 'normal' },
      { text: 'Abnormal', value: 'abnormal' },
    ]

    return STATE_TYPE.map(status => ({
      text: status.text,
      value: status.value,
    }))
  }

  getColumns = () => {
    const { getSortOrder } = this.props
    const { cluster } = this.props.match.params
    return [
      {
        title: t('RESOURCES_GPU_MIG_PROFILE_NAME'),
        dataIndex: 'name',
        sorter: true,
        sortOrder: getSortOrder('namespace'),
        search: true,
        render: (name, record) => {
          const prefix = 'petasus-'
          const nameText = name.startsWith(prefix)
            ? name.slice(prefix.length)
            : name
          return (
            <div className={styles.avatar}>
              <div className={styles.icon}>
                <i className="ico-type-gpucluster"></i>
              </div>
              <div>
                <div>
                  <Link
                    className={styles.title}
                    to={`/clusters/${cluster}/gpumigprofiles/${name}`}
                  >
                    {nameText}
                  </Link>
                </div>
              </div>
            </div>
          )
        },
      },
      {
        title: t('RESOURCES_GPU_TYPE'),
        dataIndex: 'gpuType',
        isHideable: true,
        width: 'auto',
        render: (gpuType, record) => {
          let gpuTypeList = '-'
          if (Array.isArray(gpuType) && gpuType.length > 0) {
            gpuTypeList = gpuType.map(gpuType => <p key={gpuType}>{gpuType}</p>)
          }
          return <div className={styles.text_no_wrap}>{gpuTypeList}</div>
        },
      },
      {
        title: t('RESOURCES_GPU_COUNT'),
        dataIndex: 'gpuCount',
        isHideable: true,
        width: 'auto',
        render: (gpuCount, record) => {
          const gpuCountText = record.isAllBalanced
            ? '-'
            : gpuCount == 'all'
            ? gpuCount
            : gpuCount.length
          return <div className={styles.text_no_wrap}>{gpuCountText}</div>
        },
      },
      {
        title: t('RESOURCES_GPU_USED_SM_COUNT'),
        dataIndex: 'smCount',
        isHideable: true,
        width: 'auto',
        render: (smCount, record) => {
          const smcount = record.isAllBalanced
            ? '-'
            : `${record.smCount} / ${record.totalSmCount}`
          return <div className={styles.text_no_wrap}>{smcount}</div>
        },
      },
      {
        title: t('RESOURCES_MEMORY'),
        dataIndex: 'totalMemory',
        isHideable: true,
        width: 'auto',
        render: (totalMemory, record) => {
          const memory = record.isAllBalanced
            ? '-'
            : `${record.useMemory} / ${record.totalMemory}GB`
          return <div className={styles.text_no_wrap}>{memory}</div>
        },
      },
      {
        title: t('RESOURCES_CONFIGURATION'),
        dataIndex: 'gpuTypeDetail',
        isHideable: true,
        width: 'auto',
        render: (gpuTypeDetail, record) => {
          let gpuDetailList = []
          let configrationText = ''

          if (Array.isArray(gpuTypeDetail)) {
            gpuDetailList = gpuTypeDetail.map((detail, idx) => {
              const key = Object.keys(detail)[0]
              const devices = Object.values(detail)[0] // devices = { "4g.90gb": 1, "1g.23gb": 3 }

              const output = []
              Object.entries(devices ?? {}).forEach(([key, count]) => {
                const [gStr, memoryStr] = key.replace(/_\d+$/, '').split('.')
                const g = parseInt(gStr.replace('g', ''), 10)

                for (let i = 0; i < count; i++) {
                  output.push(`${g}g.${memoryStr}`)
                }
              })

              configrationText =
                gpuTypeDetail.length > 1 ? '혼합설정' : output.join(', ')

              return (
                <div key={idx} className={styles.configRow}>
                  <strong>{key}</strong>
                  <span className={styles.configItemWrap}>
                    {output.map((item, itemIdx) => {
                      // item에서 숫자 추출 (예: "1g.20gb" -> "1g")
                      const gpuType = item.split('.')[0] // "1g", "2g", "3g", "4g", "7g"
                      const gpuTypeClass = `configItem${gpuType}`
                      return (
                        <span
                          key={itemIdx}
                          className={`${styles.configItem} ${styles[gpuTypeClass]}`}
                        >
                          {item}
                        </span>
                      )
                    })}
                  </span>
                </div>
              )
            })
          } else {
            configrationText = '-'
          }

          return (
            <div className={styles.text_no_wrap_300}>
              {record.isAllBalanced ? (
                '-'
              ) : (
                <div>
                  {configrationText}
                  {gpuDetailList.length > 1 && (
                    <Tooltip
                      content={gpuDetailList}
                      placement="top"
                      style={{ maxWidth: '500px', whiteSpace: 'normal' }}
                    >
                      <Icon
                        className="margin-l8"
                        name="log"
                        size={16}
                        clickable
                      />
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
          )
        },
      },
    ]
  }

  get emptyProps() {
    return { desc: t('RESOURCES_PLEASE_CREATE_DATA') }
  }

  get columnSearch() {
    return [
      {
        dataIndex: 'name',
        title: t('RESOURCES_NAME'),
        search: true,
      },
      {
        dataIndex: 'state',
        title: t('RESOURCES_STATE'),
        search: true,
      },
    ]
  }

  getBanner = () => {
    return <i className="ico-type-gpucluster"></i>
  }

  render() {
    const { bannerProps, tableProps } = this.props
    return (
      <ListPage {...this.props}>
        <Banner
          {...bannerProps}
          icon={this.getBanner}
          title={t('RESOURCES_GPU_MIG_PROFILE')}
          description={t('RESOURCES_GPU_MIG_PROFILE_DESC')}
        />
        <Table
          {...tableProps}
          emptyProps={this.emptyProps}
          className={'table-2-6 table-4-3'}
          itemActions={this.itemActions}
          tableActions={this.tableActions}
          columns={this.getColumns()}
          // columnSearch={this.columnSearch}
        />
      </ListPage>
    )
  }
}
