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

import React, { Component } from 'react'
import PropTypes from 'prop-types'

import { Modal } from 'components/Base'

import styles from './index.scss'

export default class AboutModal extends Component {
  static propTypes = {
    visible: PropTypes.bool,
    onCancel: PropTypes.func,
  }

  static defaultProps = {
    visible: false,
    onCancel() {},
  }

  render() {
    const { ksVersion } = globals.ksConfig
    return (
      <Modal
        bodyClassName={styles.body}
        width={600}
        hideHeader
        hideFooter
        maskClosable
        {...this.props}
      >
        <div className={styles.describtion}>
          <div>
            <img src="/assets/logo.svg" alt="" />
          </div>
          <p>{t('KS_DESCRIPTION')}</p>
          <strong>
            Petasus Kubernetes {t('VERSION')} : {ksVersion}
          </strong>
        </div>
      </Modal>
    )
  }
}
