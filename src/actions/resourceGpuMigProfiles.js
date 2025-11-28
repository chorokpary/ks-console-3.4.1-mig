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

import ConfirmModal from 'clusters/containers/Resources/components/Modals/Confirm'
import RegistModal from 'clusters/containers/Resources/components/Modals/GpuMigProfiles/Regist'
import ModifyModal from 'clusters/containers/Resources/components/Modals/GpuMigProfiles/Modify'

import EditYamlModal from 'components/Modals/EditYaml'
import DeleteModal from 'components/Modals/Delete'

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
            .then(res => {
              Modal.close(modal)
              Notify.success({ content: t('RESOURCES_CREATE_SUCCESSFUL') })
              success && success()
            })
        },
        title: t('RESOURCES_CREATE_MIG_PROFILE'),
        modal: RegistModal,
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
        },
        title: t('RESOURCES_EDIT_GPU_CLUSTER'),
        modal: ModifyModal,
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
    on({
      store,
      detail,
      cluster,
      workspace,
      namespace,
      success,
      devops,
      ...props
    }) {
      const modal = Modal.open({
        onOk: () => {
          store
            .delete({ ...props, namespace, detail, name: detail.name })
            .then(() => {
              Modal.close(modal)
              Notify.success({ content: t('RESOURCES_DELETE_SUCCESSFUL') })
              success && success()
            })
        },
        modal: DeleteModal,
        title: t('RESOURCES_DELETE'),
        desc: t.html('RESOURCES_DELETE_GPU_CLUSTER_TIP', {
          resource: detail.name.replace('petasus-', ''),
        }),
        resource: detail.name.replace('petasus-', ''),
        store,
        ...props,
      })
    },
  },
}
