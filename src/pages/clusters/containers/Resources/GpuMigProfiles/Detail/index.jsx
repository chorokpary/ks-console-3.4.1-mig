import React, { useEffect, useState } from 'react'
import DetailPage from 'clusters/containers/Base/Detail'

import { useParams } from 'react-router-dom'
import { toJS } from 'mobx'
import { get, isEmpty } from 'lodash'
import { Loading, Tooltip, Icon } from '@kube-design/components'
import { observer, inject } from 'mobx-react'
import { Card } from 'components/Base'
import { getLocalTime } from 'utils'

import GpuMigProfilesStore from 'stores/resources/gpumigprofiles'
import routes from './routes'

const store = new GpuMigProfilesStore()

const GpuMigProfileDetail = props => {
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = () => {
    store.fetchDetail(props.match.params)
  }

  const { cluster } = props.match.params
  const listUrl = `/clusters/${cluster}/gpumigprofiles`

  const routing = props.rootStore.routing
  const showEdit =
    !globals.config.presetClusterRoles.includes(props.match.params.name) &&
    !store.detail.result?.isAllBalanced

  const getOperations = () => [
    {
      key: 'delete',
      icon: 'trash',
      text: t('DELETE'),
      action: 'delete',
      type: 'danger',
      show: showEdit,
      onClick: () =>
        props.rootStore.triggerAction('gpumigprofiles.remove', {
          type: 'GPUCLUSTERS_DETAIL',
          detail: { ...toJS(store.detail.result), cluster },
          store,
          success: () => {
            setTimeout(() => {
              routing.push(listUrl)
            }, 200)
          },
        }),
    },
    {
      key: 'edit',
      icon: 'pen',
      text: t('EDIT'),
      action: 'view',
      show: showEdit,
      onClick: () =>
        props.rootStore.triggerAction('gpumigprofiles.edit', {
          detail: { ...toJS(store.detail.result), cluster },
          store,
          success: fetchData,
          ...props.match.params,
        }),
    },
  ]

  const getAttrs = () => {
    const detail = toJS(store.detail)

    if (isEmpty(detail)) {
      return
    }

    // gpu 타입 관련
    let gpuTypeList = '-'
    if (
      Array.isArray(detail.result.gpuType) &&
      detail.result.gpuType.length > 0
    ) {
      gpuTypeList = detail.result.gpuType.map(gpuType => (
        <p key={gpuType}>{gpuType}</p>
      ))
    }

    // 구성 관련 start =====================================================
    let gpuDetailList = []
    let configrationText = ''
    const gpuTypeDetail = detail.result.gpuTypeDetail

    if (Array.isArray(gpuTypeDetail)) {
      gpuDetailList = gpuTypeDetail.map((detail, idx) => {
        const key = Object.keys(detail)[0]
        const devices = Object.values(detail)[0] // devices = { "4g.90gb": 1, "1g.23gb": 3 }

        const output = []
        Object.entries(devices).forEach(([key, count]) => {
          const [gStr, memoryStr] = key.split('.')
          const g = parseInt(gStr.replace('g', ''), 10)
          for (let i = 0; i < count; i++) {
            output.push(`${g}g.${memoryStr}`)
          }
        })

        configrationText =
          gpuTypeDetail.length > 1 ? 'Mixed' : output.join(', ')

        return (
          <div key={idx}>
            <strong>{key}</strong> : {output.join(', ')}
          </div>
        )
      })
    } else {
      configrationText = '-'
    }

    let renderedConfig

    if (detail.result.isAllBalanced) {
      renderedConfig = '-'
    } else {
      renderedConfig = (
        <div>
          {configrationText}
          {gpuDetailList.length > 1 && (
            <Tooltip
              content={gpuDetailList}
              placement="top"
              style={{ maxWidth: '400px', whiteSpace: 'normal' }}
            >
              <Icon className="margin-l8" name="log" size={16} clickable />
            </Tooltip>
          )}
        </div>
      )
    }
    // 구성 관련 end  =====================================================

    return [
      {
        name: t('RESOURCES_GPU_MIG_PROFILE'),
        value: getName(detail.name),
      },
      {
        name: t('RESOURCES_GPU_TYPE'),
        value: gpuTypeList,
      },
      {
        name: t('RESOURCES_GPU_COUNT'),
        value: detail.result.isAllBalanced
          ? '-'
          : detail.result.gpuCount == 'all'
          ? detail.result.gpuCount
          : detail.result.gpuCount.length,
      },
      {
        name: t('RESOURCES_GPU_USED_SM_COUNT'),
        value: detail.result.isAllBalanced
          ? '-'
          : `${detail.result.smCount} / ${detail.result.totalSmCount}`,
      },
      {
        name: t('RESOURCES_MEMORY'),
        value: detail.result.isAllBalanced
          ? '-'
          : `${detail.result.useMemory} / ${detail.result.totalMemory}GB`,
      },
      {
        name: t('RESOURCES_CONFIGURATION'),
        value: renderedConfig,
      },
    ]
  }

  if (store.isLoading) {
    return <Loading className="ks-page-loading" />
  }

  const getBanner = () => {
    return <i className="icon ico-type-gpucluster"></i>
  }

  const getName = name => {
    const prefix = 'petasus-'
    const nameText = name.startsWith(prefix) ? name.slice(prefix.length) : name
    return nameText
  }

  const sideProps = {
    icon: getBanner(),
    module: store.module,
    name: getName(get(store.detail, 'name')),
    desc: get(store.detail, 'description', ''),
    operations: getOperations(),
    attrs: getAttrs(),
    breadcrumbs: [
      {
        label: t('RESOURCES_GPU_MIG_PROFILE'),
        url: listUrl,
      },
    ],
  }

  return (
    <>
      <DetailPage
        stores={{ detailStore: store }}
        routes={routes}
        {...sideProps}
      />
    </>
  )
}

export default inject('rootStore')(observer(GpuMigProfileDetail))
