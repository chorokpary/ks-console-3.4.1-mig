import { find } from 'lodash'
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { observer, inject } from 'mobx-react'
import {
  Form,
  Input,
  Select,
  Button,
  Column,
  Columns,
} from '@kube-design/components'
import { Modal } from 'components/Base'
import classnames from 'classnames'
import { PATTERN_USER_NAME } from 'utils/constants'
import styles from './index.scss'
import MigGpuTypeProfile from './MigGpuTypeProfile'

const GpuMigProfileModal = props => {
  const { store, mode = 'create' } = props

  const existedNames = useMemo(() => {
    return store.dataList ? store.dataList.map(item => item.name) : []
  }, [store.dataList])

  const form = useRef()

  const [modelView, setModalView] = useState(true)
  const [formData] = useState({})

  const [isDisabled, setIsDisabled] = useState(false)

  const [gpuTypeOption, setGpuTypeOption] = useState([])
  const [selectedGpuType, setSelectedGpuType] = useState(
    mode === 'edit' ? store.detail.result.gpuType[0] : ''
  )

  const [nodeList, setNodeList] = useState([])

  const [gpuTypeList, setGpuTypeList] = useState(
    mode === 'edit' ? store.detail.result.gpuType : []
  )
  const [gpuTypeError, setGpuTypeError] = useState('')

  const [migProfileData, setMigProfileData] = useState([])
  const [migProfileError, setMigProfileError] = useState('')

  const handleOk = () => {
    const onOk = props.onOk

    form.current.validator(() => {
      if (gpuTypeList.length === 0) {
        setGpuTypeError(t('RESOURCES_SELECT_GPU_TYPE_TIP'))
        return false
      }

      const checkEmptySlice = checkSliceCountMatch(migProfileData)

      if (!checkEmptySlice) {
        setMigProfileError(t('RESOURCES_GPU_SLICE_EMPTY_DESC'))
        return false
      }
      setMigProfileError('')

      setIsDisabled(true)

      const { data } = form.current.props
      delete data.gputype
      data.migprofile = migProfileData

      onOk({
        ...data,
      })
    })
  }

  const closeModal = () => {
    setModalView(false)
  }

  const fnGetModalFooter = () => {
    const isSubmitting = store.isSubmitting
    const okText = mode === 'edit' ? t('RESOURCES_EDIT') : t('RESOURCES_CREATE')

    return (
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
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {okText}
        </Button>
      </>
    )
  }

  useEffect(() => {
    const getGputype = async () => {
      const catalogData = await request.get('/gpucatalog/all')

      const nodeListConvert = catalogData.map(item => {
        const [gpuType, memory] = item.alias.split(' ')
        return {
          name: item.name,
          gpuType,
          memory,
          count: item.count,
          deviceID: item.deviceID,
        }
      })

      let uniqueData = nodeListConvert.filter(
        (item, index, self) =>
          index === self.findIndex(obj => obj.name === item.name)
      )

      const options = uniqueData.map(el => {
        return {
          label: el.gpuType,
          value: el.gpuType,
        }
      })

      setNodeList(uniqueData)
      setGpuTypeOption(options)
    }
    getGputype()
  }, [])

  // GPU Type 추가 함수
  const handleAddGpuType = () => {
    // 선택 여부 체크
    if (!selectedGpuType) {
      setGpuTypeError(t('RESOURCES_SELECT_GPU_TYPE_TIP'))
      return
    }

    // 중복 체크
    if (gpuTypeList.includes(selectedGpuType)) {
      setGpuTypeError(t('RESOURCES_DUPLICATE_GPU_TYPE'))
      return
    }

    // 8개까지 입력 가능 체크
    if (gpuTypeList.length > 7) {
      setGpuTypeError(t('RESOURCES_GPU_TYPE_ADD_TIP'))
      return
    }

    // 정상 추가
    setGpuTypeList(prev => [...prev, selectedGpuType])
    setGpuTypeError('')
    setMigProfileError('')
  }

  // GPU Type 제거 함수
  const handleRemoveGpuType = type => {
    setGpuTypeList(prev => prev.filter(t => t !== type))
    removeMigProfileType(type)
  }

  // MIG Profile 전달 받기
  const handleGpuTypeData = data => {
    addMigProfileType(data)
  }

  // type 기준으로 추가
  const addMigProfileType = newItem => {
    setMigProfileData(prev => {
      const exists = prev.some(item => item.type === newItem.type)
      if (exists) {
        // 이미 존재하면 교체
        return prev.map(item => (item.type === newItem.type ? newItem : item))
      }
      // 없으면 추가
      return [...prev, newItem]
    })
  }

  // type 기준으로 삭제
  const removeMigProfileType = type => {
    setMigProfileData(prev => {
      const updatedList = prev.filter(item => item.type !== type)

      const checkEmptySlice = checkSliceCountMatch(updatedList)

      if (!checkEmptySlice) {
        setMigProfileError(t('RESOURCES_GPU_SLICE_EMPTY_DESC'))
      } else {
        setMigProfileError('')
      }

      return updatedList
    })
  }

  const checkSliceCountMatch = profileData => {
    const totalSliceCount = profileData.reduce(
      (sum, item) => sum + Number(item.sliceCount),
      0
    )
    const totalGpuCount = profileData.reduce(
      (sum, item) => sum + item.data.length,
      0
    )

    if (totalSliceCount === 0 && totalGpuCount === 0) {
      return false
    }
    return totalGpuCount >= 1
  }

  const getName = name => {
    const prefix = 'petasus-'
    return name.startsWith(prefix) ? name.slice(prefix.length) : name
  }

  const nameRules = useMemo(() => {
    const rules = [
      { required: true, message: t('NAME_EMPTY_DESC') },
      {
        pattern: PATTERN_USER_NAME,
        message: t('RESOURCES_INVALID_NAME_DESC'),
      },
    ]
    if (mode === 'create') {
      rules.push({
        validator: (_, value) => {
          if (!value) return Promise.resolve()
          const nameText = `petasus-${value.trim()}`
          const isDuplicated = existedNames.includes(nameText)

          return isDuplicated
            ? Promise.reject(new Error(t('RESOURCES_DUPLICATE_NAME')))
            : Promise.resolve()
        },
      })
    }
    return rules
  }, [mode, existedNames])

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
            <div className={`${styles.cont_boxwrap} gpu_mig_container`}>
              <Columns>
                <Column>
                  <Form.Item
                    label={t('RESOURCES_GPU_MIG_PROFILE_NAME')}
                    rules={nameRules}
                    desc={t('NAME_DESC')}
                  >
                    <Input
                      name="name"
                      autoFocus={true}
                      maxLength={63}
                      style={{ maxWidth: 'none' }}
                      defaultValue={
                        mode === 'edit' ? getName(store.detail.name) : undefined
                      }
                      disabled={mode === 'edit' ? true : isDisabled}
                    />
                  </Form.Item>
                </Column>
                <Column>
                  <div className={styles.divwrap}>
                    <div className={styles.div_left}>
                      <Form.Item
                        label={
                          <span>
                            {t('RESOURCES_GPU_TYPE')}
                            <span style={{ color: '#ca2621' }}> *</span>
                          </span>
                        }
                        desc={t('RESOURCES_SELECT_GPU_TYPE_DESC')}
                      >
                        <Select
                          name="gputype"
                          defaultValue={
                            mode === 'edit'
                              ? store?.detail.result.gpuType[0]
                              : undefined
                          }
                          placeholder={t('RESOURCES_SELECT')}
                          style={{ maxWidth: 'none' }}
                          options={gpuTypeOption}
                          onChange={value => {
                            setSelectedGpuType(value)
                            setGpuTypeError('')
                          }}
                        />
                      </Form.Item>
                      <div className={styles.wrapperError}>
                        <div
                          className={`form-item-error ${
                            !gpuTypeError ? 'hide' : ''
                          }`}
                        >
                          {gpuTypeError}
                        </div>
                      </div>
                    </div>
                    <div className={styles.div_right}>
                      <Button onClick={handleAddGpuType}>
                        {t('RESOURCES_ADD')}
                      </Button>
                    </div>
                  </div>
                </Column>
              </Columns>

              {/* MIG Profile 정의 시작 */}
              <div className="sub_title_area">
                <div>
                  <label className="form-item-label">
                    MIG Profile<span className="form-item-required">*</span>
                  </label>
                  <p className="sub_title">
                    {t('RESOURCES_CREATE_DIFINE_MIG_PROFILE_GPU')}
                  </p>
                  <div className={styles.wrapperError}>
                    <div
                      className={`form-item-error ${
                        !migProfileError ? 'hide' : ''
                      }`}
                    >
                      {migProfileError}
                    </div>
                  </div>
                </div>
                {gpuTypeList.length > 0 && (
                  <button
                    className="btn delete_all_btn"
                    onClick={() => {
                      setGpuTypeList([])
                      setMigProfileError('')
                    }}
                  >
                    {t('RESOURCES_ALL_DEL')}
                  </button>
                )}
              </div>

              <div
                className="gpu_mig_container create_wrap"
                style={{ minHeight: '495px' }}
              >
                {// No Data
                gpuTypeList.length === 0 && (
                  <div className="gpu_mig_secter">
                    <div className={styles.wrapper}>
                      <div className={styles.empty}>
                        <i className="ico-type-gpuaas-gpu"></i>
                        {t('RESOURCES_ADD_GPU_TYPE_TIP')}
                      </div>
                    </div>
                  </div>
                )}
                {// GPU Profile List
                gpuTypeList.length > 0 &&
                  nodeList.length > 0 &&
                  gpuTypeList.map(gpuType => {
                    const foundNode = find(nodeList, { gpuType })
                    if (!foundNode) return null
                    const { name, count, deviceID } = foundNode

                    return (
                      <MigGpuTypeProfile
                        key={gpuType}
                        name={name}
                        gpuType={gpuType}
                        handleRemoveGpuType={handleRemoveGpuType}
                        handleGpuTypeData={handleGpuTypeData}
                        totalGpuCount={count}
                        deviceId={deviceID}
                        sliceType={gpuTypeOption.length > 1 ? 'B' : 'M'}
                        mode={mode}
                        modifyData={
                          mode === 'edit' ? store.detail.result : undefined
                        }
                      />
                    )
                  })}
              </div>

              {/* MIG Profile 정의 끝 */}
            </div>
          </div>

          {/* Footer */}
          <div className={styles['modal-footer']}>{fnGetModalFooter()}</div>
        </Form>
      </Modal>
    </>
  )
}

export default inject('store')(observer(GpuMigProfileModal))
