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

import { toJS } from 'mobx'
import { Notify } from '@kube-design/components'
import { Modal } from 'components/Base'

import AlertModal from 'clusters/containers/Resources/components/Modals/Alert'

import GpuNodeStore from 'stores/resources/gpunodes'
import PodStore from 'stores/pod'

import ApplyModal from 'clusters/containers/Resources/components/Modals/GpuNodeMig/Apply'
import ApplyRemoveModal from 'clusters/containers/Resources/components/Modals/GpuNodeMig/Remove'


export default {
  'gpunodemig.apply': {
    on({
      store,
      rootStore,
      cluster,
      workspace,
      namespace,
      success,
      devops,
      ...props
    }) {
      const gpuNodeStore = new GpuNodeStore();
      const modal = Modal.open({
        onOk: data => {
          gpuNodeStore
            .applyMig(data, { cluster, workspace, namespace, devops })
            .then(res => {
              Modal.close(modal)
              Notify.success({ content: t('RESOURCES_APPLY_SUCCESS_DESC') })
              success && success()
            })
        },
        title: t('RESOURCES_GPU_MIG_CONFIG'),
        modal: ApplyModal,
        store,
        rootStore,
        gpuNodeStore,
        cluster,
        workspace,
        namespace,
        devops,
        ...props,
      })
    },
  },
  'gpunodemig.apply.remove': {
   async on({
      store,
      rootStore,
      cluster,
      workspace,
      namespace,
      success,
      devops,
      nodeName,
      slicePodList,
      delName,
      ...props
    }) {

      const podStore = new PodStore();
      const hasSlice = await podStore.checkUsedPod({
        gpuSlice : slicePodList,  
        nodeName,  
      })
      console.log("hasSlice : "+ hasSlice)

      const gpuNodeStore = new GpuNodeStore();
      const modal = Modal.open({
        onOk: data => {
          gpuNodeStore
            .applyMigRemove(data, { cluster, workspace, namespace, devops })
            .then(() => {
              Modal.close(modal)
              Notify.success({ content: t('RESOURCES_RELEASE_SUCCESSFULLY') })
              success && success()
            })
        },
        modal: hasSlice ? AlertModal : ApplyRemoveModal,
        title: t('RESOURCES_GPU_MIG_CONFIG_REMOVE'),
        store,
        rootStore,
        gpuNodeStore,
        cluster,
        workspace,
        namespace,
        devops,
        ...props,
        resource: delName,
        desc: hasSlice ? t('RESOURCES_USED_MIG_RELEAGE_TIP') : t('RESOURCES_MIG_RELEAGE_DESC'),
      })
    },
  },
}
