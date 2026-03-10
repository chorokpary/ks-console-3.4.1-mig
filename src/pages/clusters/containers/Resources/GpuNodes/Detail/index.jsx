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

import React, { useEffect } from 'react';
import { toJS } from 'mobx';
import { get, isEmpty } from 'lodash';
import { Loading } from '@kube-design/components';
import { observer, inject } from 'mobx-react';
import GpuNodeStore from 'stores/resources/gpunodes';
import DetailPage from 'clusters/containers/Base/Detail';
import { Status } from 'components/Base'

import { getNodeRoles, getNodeStatus } from 'utils/node'

import { getDisplayName, getLocalTime } from 'utils'

import routes from './routes';

const store = new GpuNodeStore();

const GpuNodeDetail = props => {
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = () => {
        store.fetchDetail(props.match.params);
    };
    
    const listUrl = () => {
        const { cluster } = props.match.params;
        return `/clusters/${cluster}/gpunodes`;
    };

    const routing = props.rootStore.routing;

    const isMigApply = get(store.detail, 'labels["nvidia.com/mig.config"]') === 'all-disabled';
    const migConfig = get(store.detail, 'labels["nvidia.com/mig.config"]', '');

    const getOperations = () => [
        {
            key: 'applyMig',
            icon: 'gpu',
            disabled: !isMigApply,
            text: t('RESOURCES_GPU_MIG_CONFIG'),
            action: 'view',
            onClick: () => {
                props.rootStore.triggerAction('gpunodemig.apply', {
                  store: store,
                  cluster: props.match.params.cluster,
                  success: fetchData,
                });
            },
        },
                {
            key: 'applyMigRemove',
            icon: 'gpu',
            disabled: isMigApply,
            text: t('RESOURCES_GPU_MIG_CONFIG_REMOVE'),
            action: 'view',
            onClick: () => {
                props.rootStore.triggerAction('gpunodemig.apply.remove', {
                  store: store,
                  cluster: props.match.params.cluster,
                  success: fetchData,
                });
            },
        },
    ]

    const getAttrs = () => {
       const detail = toJS(store.detail)
   
       if (isEmpty(detail)) {
         return
       }

      const statusStr = getNodeStatus(detail)

      const status = (
         <Status
           type={statusStr}
           name={t(`NODE_STATUS_${statusStr.toUpperCase()}`)}
         />
       )
       const address = get(detail, 'status.addresses[0].address', '-')
       const nodeInfo = detail.nodeInfo || {}

       return [
         {
           name: t('STATUS'),
           value: status,
         },
         {
           name: t('IP_ADDRESS'),
           value: address,
         },
         {
           name: t('ROLE'),
           value:
             getNodeRoles(detail.labels).indexOf('master') === -1
               ? t('WORKER')
               : t('CONTROL_PLANE'),
         },
         {
           name: t('OS_VERSION'),
           value: nodeInfo.osImage,
         },
         {
           name: t('OS_TYPE'),
           value: t(nodeInfo.operatingSystem.toUpperCase()),
         },
         {
           name: t('KERNEL_VERSION'),
           value: nodeInfo.kernelVersion,
         },
         {
           name: t('CONTAINER_RUNTIME'),
           value: nodeInfo.containerRuntimeVersion,
         },
         {
           name: t('KUBELET_VERSION'),
           value: nodeInfo.kubeletVersion,
         },
         {
           name: t('KUBE_PROXY_VERSION'),
           value: nodeInfo.kubeProxyVersion,
         },
         {
           name: t('ARCHITECTURE'),
           value: nodeInfo.architecture.toUpperCase(),
         },
         
         {
           name: t('MIG Config'),
           value: isMigApply ? "" : migConfig.replace('petasus-', ''),
         },
         {
           name: t('CREATION_TIME_TCAP'),
           value: getLocalTime(detail.createTime).format('YYYY-MM-DD HH:mm:ss'),
         },
       ]
     }
    if (store.isLoading) {
        return <Loading className="ks-page-loading" />;
    }

    const sideProps = {
        icon: 'nodes',
        module: store.module,
        name: get(store.detail, 'name'),
        operations: getOperations(),
        attrs: getAttrs(),
        breadcrumbs: [
            {
                label: t('RESOURCES_GPU_NODE'),
                url: listUrl,
            },
        ],
    };

    return (
        <>
            <DetailPage
                stores={{ detailStore: store }}
                routes={routes}
                {...sideProps}
            />
        </>
    );
};

export default inject('rootStore')(observer(GpuNodeDetail));
