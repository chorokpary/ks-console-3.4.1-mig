import React from 'react'

import { ICON_TYPES, NODE_STATUS } from 'utils/constants';
import GpuNodeStore from 'stores/resources/gpunodes';

import withList, { ListPage } from 'components/HOCs/withList';

import { Avatar, Status } from 'components/Base'
import Table from 'components/Tables/List';
import Banner from 'components/Cards/Banner'

import styles from './index.scss'

@withList({
  store: new GpuNodeStore(),
  module: 'gpunodes',
  authKey: 'gpunodes',
  name: 'GpuNode',
})
export default class GpuNodes extends React.Component {
  getStatus() {
    return NODE_STATUS.map(status => ({
      text: t(status.text),
      value: status.value,
    }))
  }

  get itemActions() {
    const { getData, trigger } = this.props;
    return [];
  }

  get tableActions() {
    const { trigger, getData, routing, tableProps } = this.props;
    return {
      ...tableProps.tableActions,
      selectActions: [
      ],
    };
  }

  get emptyProps() {
    return { desc: t('RESOURCES_NO_DATA') };
  }

  getColumns = () => {
    const { getSortOrder, getFilteredValue } = this.props;
    const { cluster } = this.props.match.params;

    return [
      {
        title: t('NAME'),
        dataIndex: 'name',
        sorter: true,
        sortOrder: getSortOrder('name'),
        search: true,
        render: (name, record) => (
          <Avatar
            icon={ICON_TYPES["nodes"]}
            iconSize={40}
            title={name}
            to={`/clusters/${cluster}/gpunodes/${name}`}
            desc={record.node_ip}
          />
        ),
      },
      {
        title: t('STATUS'),
        dataIndex: 'status',
        filters: this.getStatus(),
        filteredValue: getFilteredValue('status'),
        isHideable: true,
        search: true,
        render: (_, record) => {
          const status = record.status

          return (
            <div className={styles.status}>
              <Status
                type={status}
                name={t(`NODE_STATUS_${status.toUpperCase()}`)}
              />
            </div>
          )
        },
      },
      {
        title: t('RESOURCES_GPU_VENDOR'),
        dataIndex: 'vendor',
        isHideable: true,
        search: true,
        width: 'auto',
        render: (_, record) => {
          const vendor = record.vendor_name
          return vendor.toUpperCase();
        }
      },
      {
        title: t('RESOURCES_GPU_MODEL'),
        dataIndex: 'model',
        isHideable: true,
        search: true,
        width: 'auto',
      },
      {
        title: t('RESOURCES_GPU_WORKLOAD_TYPE'),
        dataIndex: 'workload_type',
        isHideable: true,
        width: 'auto',
      },
      {
        title: t('RESOURCES_GPU_DRIVER_TYPE'),
        dataIndex: 'driver_type',
        isHideable: true,
        width: 'auto',
      },
      {
        title: t('RESOURCES_GPU_CONFIG_STATE'),
        dataIndex: 'config_state',
        isHideable: true,
        width: 'auto',
        render: config_state => {
          const config_state_str =
            config_state === "" ? (
              "-"
            ) : (
              <p>{t(`RESOURCES_GPU_CONFIG_STATE_${config_state.toUpperCase()}`)}</p>
            );
          return config_state_str;
        },
      },
      {
        title: t('RESOURCES_GPU_COUNT'),
        dataIndex: 'count',
        isHideable: true,
        width: 'auto',
      },
    ];
  }

  render() {
    const { bannerProps, tableProps } = this.props;

    return (
      <ListPage {...this.props}>
        <Banner
          icon="nodes"
          {...bannerProps}
          title={t('RESOURCES_GPU_NODE')}
          description={t('RESOURCES_GPU_NODE_DESC')}
        />
        <Table
          {...tableProps}
          emptyProps={this.emptyProps}
          tableActions={this.tableActions}
          itemActions={this.itemActions}
          columns={this.getColumns()}
        />
      </ListPage>
    );
  }
}
