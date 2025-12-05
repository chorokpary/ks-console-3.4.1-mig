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

import React from 'react'

import { Icon, Tooltip } from '@kube-design/components'
import { Text } from 'components/Base'

import styles from './index.scss'

const DeploymentCard = ({ data }) => {
    return (
        <div className={styles.card}>
            <div className={styles.icon}>
                <Icon name="templet" size={40} />
                <Tooltip content={data.name}>
                    {data.flag ? (
                        <Icon
                            className={styles.check}
                            name="check"
                            type="light"
                            size={12}
                        />
                    ) : (
                        <Icon
                            className={styles.substract}
                            name="substract"
                            type="light"
                            size={12}
                        />
                    )}
                </Tooltip>
            </div>
            <Text
                title={t(`RESOURCES_GPU_DEPLOY_${data.name.toUpperCase()}`)}
                description={t(`RESOURCES_GPU_DEPLOY_${data.name.toUpperCase()}_DESC`)}
            />
        </div>
    )
}

export default DeploymentCard
