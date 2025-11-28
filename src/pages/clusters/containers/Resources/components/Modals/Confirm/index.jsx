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
import PropTypes from 'prop-types'

import { Button, Icon, Input } from '@kube-design/components'
import { Modal } from 'components/Base'

import styles from './index.scss'

export default class ConfirmModal extends React.Component {
  static propTypes = {
    type: PropTypes.string,
    resource: PropTypes.string,
    visible: PropTypes.bool,
    title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    desc: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    onOk: PropTypes.func,
    onCancel: PropTypes.func,
    isSubmitting: PropTypes.bool,
  }

  static defaultProps = {
    visible: false,
    isSubmitting: false,
    onOk() {},
    onCancel() {},
  }

  state = {
    confirm: '',
  }

  componentDidUpdate(prevProps) {
    if (this.props.visible && this.props.visible !== prevProps.visible) {
      this.setState({ confirm: '' })
    }
  }

  handleInputChange = e => {
    this.setState({ confirm: e.target.value })
  }

  handleOk = () => {
    this.props.onOk()
  }

  render() {
    const { type, visible, onCancel, title, desc, isSubmitting } = this.props

    const tip = desc
    return (
      <Modal
        width={504}
        bodyClassName={styles.modalBody}
        visible={visible}
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        hideHeader
        hideFooter
      >
        <div className={styles.body}>
          <div className="h5">
            <Icon name="close" type="light" />
            {title}
          </div>
          <div className={styles.content}>
            <p>{tip}</p>
          </div>
        </div>
        <div className={styles.footer}>
          <Button onClick={onCancel} data-test="modal-cancel">
            {t('CANCEL')}
          </Button>
          <Button
            type="control"
            loading={isSubmitting}
            onClick={this.handleOk}
            data-test="modal-ok"
          >
            {t('OK')}
          </Button>
        </div>
      </Modal>
    )
  }
}
