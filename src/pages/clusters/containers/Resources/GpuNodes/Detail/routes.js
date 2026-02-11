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

import { getIndexRoute } from 'utils/router.config'

import Status from 'clusters/containers/Resources/GpuNodes/Detail/Status'
import GpuDevice from 'clusters/containers/Resources/GpuNodes/Detail/GpuDevice'
import Pod from 'clusters/containers/Resources/GpuNodes/Detail/Pod'
import MigMonitoring from 'clusters/containers/Resources/GpuNodes/Detail/MigMonitoring'
import RunningStatus from 'clusters/containers/Resources/GpuNodes/Detail/RunningStatus'

const PATH = '/clusters/:cluster/gpunodes/:name'

export default [
    {
        path: `${PATH}/status`,
        title: 'RUNNING_STATUS',
        component: RunningStatus,
        exact: true,
    },
    // {
    //     path: `${PATH}/status`,
    //     title: t('RESOURCES_STATE'),
    //     component: Status,
    //     exact: true,
    // },
    {
        path: `${PATH}/gpu-devices`,
        title: t('RESOURCES_GPU_DEVICE'),
        component: GpuDevice,
        exact: true,
    },
    {
        path: `${PATH}/pod`,
        title: t('POD_PL'),
        component: Pod,
        exact: true,
    },
    {
        path: `${PATH}/monitoring`,
        title: 'MIG '+ t('MONITORING'),
        component: MigMonitoring,
        exact: true,
    },
    getIndexRoute({ path: PATH, to: `${PATH}/status`, exact: true }),
]
