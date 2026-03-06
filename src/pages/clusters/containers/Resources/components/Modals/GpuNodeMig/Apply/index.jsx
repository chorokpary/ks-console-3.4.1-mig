import { get, find } from 'lodash'
import React, { useState, useRef, useEffect, useMemo } from 'react'

import { observer, inject } from 'mobx-react'

import {
  Form,
  Input,
  Select,
  Checkbox,
  TextArea,
  Button,
  Loading,
  Column,
  Columns,
  Icon,
  Toggle,
} from '@kube-design/components'
import { Modal } from 'components/Base'
import classnames from 'classnames'

import { PATTERN_USER_NAME } from 'utils/constants'
import styles from './index.scss'

import NodeStore from 'stores/node'
import GpuMigProfilesStore from 'stores/resources/gpumigprofiles'

const ApplyModal = props => {

  const testNode = 'kubesphere01'

  const store = props.store
  const rootStore = props.rootStore
  const nodeStore = new NodeStore()

  const nodeName = store.detail.name || testNode

  const gpuMigProfilesStore = new GpuMigProfilesStore()
  
  const form = useRef()

  const [modelView, setModalView] = useState(true)
  const [formData, setFormData] = useState({})

  const [isDisabled, setIsDisabled] = useState(false)

  const [migProfileAllData, setMigProfileAllData] = useState()
  const [nodeDetailData, setNodeDetailData] = useState()

  const [migProfileOption, setMigProfileOption] = useState([])
  const [selectedMigProfile, setSelectedMigProfile] = useState('')

  const [migProfileDetail, setMigProfileDetail] = useState()
  const [migProfileError, setMigProfileError] = useState('')

  const [projectName, setProjectName] = useState(
    props.namespace ? props.namespace : 'default'
  )
  
  const [isLoading, setIsLoading] = useState(true)
  const [sliceSmCount, setSliceSmCount] = useState(0)
  const [sliceMemory, setSliceMemory] = useState(0)

  const [isMigApply, setIsMigApply] = useState(false)


  const handleOk = () => {
    const onOk = props.onOk

    form.current.validator(() => {

      // 선택 여부 체크
      if (!selectedMigProfile) {
        setMigProfileError(t('RESOURCES_SELECT_MIG_PROFILE_TYPE_TIP'))
        return
      }
      
      const { data } = form.current.props
      data.migprofile = selectedMigProfile

      console.log("data : "+ JSON.stringify(data))

      onOk( {
        ...data,
        detail: nodeDetailData,
        cluster: props.cluster
      })
    })
  }

  const closeModal = () => {
    setModalView(false)
  }

  const fnGetModalFooter = () => {
    let elements = ''
    elements = (
      <>
        <Button
          onClick={() => closeModal()}
          className={classnames(styles['btn'], styles['btn-default'])}
        >
          {t('RESOURCES_CANCEL')}
        </Button>
        <Button
          onClick={() => {
            handleOk()
          }}
          className={classnames(styles['btn'], styles['btn-control'])}
          loading={props.store.isSubmitting}
          disabled={props.store.isSubmitting || isMigApply}
        >
          {t('RESOURCES_SAVE')}
        </Button>
      </>
    )
    return elements
  }
  

  useEffect(() => {

    const getInitData = async () => {

      // MIG Profile 정보 추출
      const params = {limit: 10000}
      const migProfileAllList = await gpuMigProfilesStore.fetchList(params)

      const profileList = migProfileAllList.map(item => item.name);
  
      const migOption = profileList.filter(item => item !== 'all-balanced')
      .map(name => ({
          label: name,
          value: name
      }));

      setMigProfileAllData(migProfileAllList)
      setMigProfileOption(migOption)

      // node 상세 정보 추출
      const nodeParams = {
        name: store.detail.name || testNode,
        cluster: props.cluster
      }
      const nodeDetail = await nodeStore.fetchDetail(nodeParams)

      setNodeDetailData(nodeDetail)

      // MIG 적용 여부 
      const isMig = !!(
        nodeDetail.labels["nvidia.com/mig.config"] &&
        nodeDetail.labels["nvidia.com/mig.config"] !== "all-disabled"
      );
      
      setIsMigApply(isMig)
    }

    getInitData()

  }, [])

  useEffect(() => {

    const getMigProfileDetail = async () => {
      const detailData = migProfileAllData?.filter(item => item.name === selectedMigProfile)[0]

      setMigProfileDetail(detailData)
      setSliceSmCount(detailData?.totalSmCount / detailData?.gpuCount.length)
      setSliceMemory(detailData?.totalMemory / detailData?.gpuCount.length)
      setIsLoading(false)  
    }

    getMigProfileDetail()

  },[selectedMigProfile])

  const MIGGpuTypeSlice = ({ gpuName, devices }) => {
    
    const sliceArray = []
    Object.entries(devices ?? {}).forEach(([key, count]) => {
      const [gStr, memoryStr] = key.replace(/_\d+$/, '').split('.')
      const g = parseInt(gStr.replace('g', ''), 10)
      for (let i = 0; i < count; i++) {
        sliceArray.push(`${g}g.${memoryStr}`)
      }
    })

    let addCount = 0
    let addMemory = 0

    sliceArray.forEach(item => {
      const [gPart, memPart] = item.split('.')
      addCount += parseInt(gPart.replace('g', ''), 10)
      addMemory += parseInt(memPart.replace('gb', ''), 10)
    })
    
    return (   
         <Loading spinning={isLoading}> 
            <section className="gpu_mig_box">
              <header className="gpu_mig_header">
                <h2 className="gpu_mig_gpu_title">{gpuName}</h2>
                <nav className="gpu_mig_status">
                  <div className="status_item">
                    <span className="label">SM</span>
                    <span className="number">
                      <strong>{addCount}</strong>/<small>{sliceSmCount}</small>
                    </span>
                  </div>
                  <div className="status_item">
                    <span className="label">메모리</span>
                    <span className="number">
                      <strong>{addMemory}</strong>/<small>{sliceMemory} GB</small>
                    </span>
                  </div>
                </nav>
              </header>         
                <ul className={`mig_bar_chart`}>
                  {sliceArray.map((item, index) => {
                    const parts = item.split('.')
                    const value = parts[0] || item
                    return (
                      <li
                        key={`${gpuName}_${index}`}
                        className={`profile p_${value}`}
                      >
                        <div>
                          <span>{item}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>         
            </section>
          </Loading> 
      )
    }

  const sortByGpuKey = list => {
    return list.sort((a, b) => {
      const keyA = Object.keys(a)[0]
      const keyB = Object.keys(b)[0]

      const numA = Number(keyA.split('_')[1])
      const numB = Number(keyB.split('_')[1])

      return numA - numB
    })
  }

  return (
    <>
      <Modal
        icon="pen"
        width={960}
        title={props.title}
        onOk={handleOk}
        onCancel={closeModal}
        visible={modelView}
        bodyClassName={styles.body}
        hideFooter
      >
        <Form data={formData} ref={form}>
          <div className={styles.pop_overflow_y}>
            <div className={styles.cont_boxwrap}>
              <Columns>
                <Column>
                  <Form.Item
                    label={t('RESOURCES_GPU_NODE')}
                    rules={[
                      { required: true, message: t('NAME_EMPTY_DESC') },
                    ]}
                  >
                    <Input
                      name="nodeName"
                      autoFocus={true}
                      defaultValue={nodeName}
                      style={{ maxWidth: 'none' }}
                      disabled={true}
                    />
                  </Form.Item>
                </Column>
                <Column> 
                </Column>
              </Columns>
              <Columns>
                <Column>
                  <Form.Item
                      label={
                        <span>
                          {t('RESOURCES_MIG_PROFILE')}
                          <span style={{ color: '#ca2621' }}> *</span>
                        </span>
                      }
                      desc={t('RESOURCES_SELECT_PROFILE_TYPE_GPU_DESC')}
                    >
                      <Select
                        name="migprofile"
                        placeholder={t('RESOURCES_SELECT')}
                        style={{ maxWidth: 'none' }}
                        options={migProfileOption}
                        onChange={value => {
                          setSelectedMigProfile(value)
                          setMigProfileError('')
                        }}
                      />
                  </Form.Item>
                  <div className={styles.wrapperError}>
                    <div
                      className={`form-item-error ${
                        !migProfileError ? 'hide' : ''
                      }`}
                    >
                      {migProfileError}
                    </div>
                  </div>
                </Column>
                <Column> 
                </Column>
              </Columns>  

              <div className="gpu_mig_container create_wrap" style={{ minHeight: '495px' }}>
                {// No Data
                !!!selectedMigProfile && (
                  <div className="gpu_mig_secter">
                    <div className={styles.wrapper}>
                      <div className={styles.empty}>
                        {t('RESOURCES_SELECT_MIG_PROFILE_TYPE_TIP')}
                      </div>
                    </div>
                  </div>
                )}                           
                {
                (!!selectedMigProfile && !isLoading)  && (              
                  <div className="gpu_mig_secter">
                    <div className="header_area">
                      <div className="title">
                        <span>{selectedMigProfile}</span>
                      </div>
                      <div className="control">
                        <span style={{ padding: 8 }}>{`GPU ${migProfileDetail?.gpuCount.length}`}</span>                  
                      </div>
                    </div>
                    <div className="create">                      
                        {migProfileDetail && sortByGpuKey(migProfileDetail?.gpuTypeDetail).map((item, index) => {
                          const key = Object.keys(item)[0]
                          const devices = Object.values(item)[0]
                          const num = String(key.split('_')[1]).padStart(2, '0')
                          const gpuName = num == 'all' ? 'ALL' : `GPU${num}`
                          return (
                            <MIGGpuTypeSlice
                              key={key}
                              gpuName={gpuName}
                              devices={devices}
                            />
                          )
                        })}
                    </div>
                  </div>   
                )}
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className={styles['modal-footer']}>{fnGetModalFooter()}</div>
        </Form>
      </Modal>
    </>
  )
}

export default inject('store', 'rootStore')(observer(ApplyModal))
