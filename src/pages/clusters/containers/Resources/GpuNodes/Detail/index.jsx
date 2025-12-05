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
    const workload_type = store.detail.gpunode?.workload_type;


    const getOperations = () => [
        {
            key: 'applyMig',
            icon: 'gpu',
            disabled: false,
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
            key: 'configWorkload',
            icon: 'gpu',
            disabled: true,
            text: t('RESOURCES_GPU_MIG_CONFIG_REMOVE'),
            action: 'view',
            onClick: () => {
                props.rootStore.triggerAction('gpunodemig.remove', {
                    store: store,
                    cluster: props.match.params.cluster,
                    success: fetchData,
                });
            },
        },
    ]

    const getAttrs = () => {
        const detail = toJS(store.detail);

        if (isEmpty(detail)) {
            return;
        }

	const gpunode = detail.gpunode;
        const status = (
            <Status
                type={gpunode.status}
                name={t(`NODE_STATUS_${gpunode.status.toUpperCase()}`)}
            />
        )
        const info = gpunode.info || {}
        const capable = gpunode.capable || {}

        return [
            {
                name: t('RESOURCES_CLUSTER'),
                value: detail.cluster,
            },
            {
                name: t('STATUS'),
                value: status,
            },
            {
                name: t('IP_ADDRESS'),
                value: gpunode.node_ip,
            },
            {
                name: t('RESOURCES_MACHINE'),
                value: gpunode.machine,
            },
            {
                name: t('OS_VERSION'),
                value: info.os_image,
            },
            {
                name: t('OS_TYPE'),
                value: t(info.os_distro.toUpperCase()),
            },
            {
                name: t('CONTAINER_RUNTIME'),
                value: info.container_runtime,
            },
            {
                name: t('ARCHITECTURE'),
                value: info.architecture.toUpperCase(),
            },
            {
                name: t('RESOURCES_GPU_VENDOR'),
                value: gpunode.vendor_name.toUpperCase(),
            },
            {
                name: t('RESOURCES_GPU_FAMILY'),
                value: gpunode.family.toUpperCase(),
            },
            {
                name: t('RESOURCES_GPU_MODEL'),
                value: gpunode.model,
            },
            {
                name: t('RESOURCES_GPU_RAM'),
                value: gpunode.memory_gib,
            },
            {
                name: t('RESOURCES_GPU_DRIVER_VERSION'),
                value: gpunode.driver_version,
            },
            {
                name: t('RESOURCES_GPU_CUDA_VERSION'),
                value: gpunode.cuda_version,
            },
            {
                name: t('RESOURCES_GPU_COUNT'),
                value: gpunode.count,
            },
	    {
                name: t('RESOURCES_GPU_WORKLOAD_TYPE'),
                value: gpunode.workload_type,
            },
            {
                name: t('RESOURCES_GPU_MIG'),
                value: capable.mig ? t('RESOURCES_SUPPORT') : t('RESOURCES_NOT_SUPPORT'),
            },           
        ];
    };

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
