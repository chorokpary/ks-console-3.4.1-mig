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
import ConfirmModal from 'clusters/containers/Resources/components/Modals/Confirm'
import GpuMigProfileModal from 'clusters/containers/Resources/components/Modals/GpuMigProfiles/Manage'

import EditYamlModal from 'components/Modals/EditYaml'
import DeleteModal from 'components/Modals/Delete'

import NodeStore from 'stores/node'

const handleActionError = (err, modal) => {
  if (modal) {
    Modal.close(modal)
  }

  const status = err?.status || err?.code || err?.response?.status

  if (status === 409) {
    Notify.error({
      content: t('RESOURCES_MIG_PROFILE_CONFLICT_DESC'),
    })
  } else if (status === 403) {
    Notify.error({
      content: t('RESOURCES_MIG_PROFILE_FORBIDDEN_DESC'),
    })
  } else {
    Notify.error({
      content: err?.message || t('RESOURCES_MIG_PROFILE_OPERATION_FAILED_DESC'),
    })
  }
}

export default {
  'gpumigprofiles.regist': {
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
      const modal = Modal.open({
        onOk: data => {
          store
            .create(data, { cluster, workspace, namespace, devops })
            .then(() => {
              Modal.close(modal)
              Notify.success({ content: t('RESOURCES_CREATE_SUCCESSFUL') })
              success && success()
            })
            .catch(err => handleActionError(err, modal))
        },
        title: t('RESOURCES_CREATE_MIG_PROFILE'),
        modal: GpuMigProfileModal,
        mode: 'create',
        store,
        rootStore,
        cluster,
        workspace,
        namespace,
        devops,
        ...props,
      })
    },
  },
  'gpumigprofiles.edit': {
    on({
      store,
      module,
      detail,
      cluster,
      workspace,
      namespace,
      success,
      devops,
      ...props
    }) {
      const modal = Modal.open({
        onOk: data => {
          store
            .update(data, { cluster, workspace, namespace, devops })
            .then(() => {
              Modal.close(modal)
              Notify.success({ content: t('RESOURCES_EDIT_SUCCESSFUL') })
              success && success()
            })
            .catch(err => handleActionError(err, modal))
        },
        title: t('RESOURCES_EDIT_GPU_CLUSTER'),
        modal: GpuMigProfileModal,
        mode: 'edit',
        store,
        cluster,
        workspace,
        namespace,
        module,
        ...props,
      })
    },
  },
  'gpumigprofiles.remove': {
    async on({
      store,
      detail,
      cluster,
      workspace,
      namespace,
      success,
      devops,
      ...props
    }) {

      const nodeStore = new NodeStore()
      const nodeList = await nodeStore.fetchList({limit: 10000})

      const isMig = nodeList.some(
        item => item?.labels?.["nvidia.com/mig.config"] === detail.name
      );

      const modal = Modal.open({
        onOk: () => {
          store
            .delete({ ...props, namespace, detail, name: detail.name })
            .then(() => {
              Modal.close(modal)
              Notify.success({ content: t('RESOURCES_DELETE_SUCCESSFUL') })
              success && success()
            })
            .catch(err => handleActionError(err, modal))
        },
        modal: isMig ? AlertModal : DeleteModal,
        title: t('RESOURCES_DELETE'),
        desc: isMig ? t.html('RESOURCES_USED_GPU_MIG_PROFILE_TIP') : t.html('RESOURCES_DELETE_GPU_MIG_PROFILE_TIP', {
              resource: detail.name.replace('petasus-', ''),
            }),
        resource: detail.name.replace('petasus-', ''),
        store,
        ...props,
      })
    },
  },
}
