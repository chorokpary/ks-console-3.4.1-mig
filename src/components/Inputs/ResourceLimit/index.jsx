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
import classnames from 'classnames'
import {
  get,
  set,
  isEqual,
  isFinite,
  isEmpty,
  isNaN,
  isUndefined,
  range,
} from 'lodash'

import {
  Icon,
  Input,
  Columns,
  Column,
  Alert,
  Select,
} from '@kube-design/components'

import { UnitSlider, NumberInput } from 'components/Inputs'

import { cpuFormat, memoryFormat } from 'utils'

import styles from './index.scss'

import NodeStore from 'stores/node'
import GpuMigProfilesStore from 'stores/resources/gpumigprofiles'

export default class ResourceLimit extends React.Component {
  static propTypes = {
    value: PropTypes.object,
    defaultValue: PropTypes.object,
    onChange: PropTypes.func,
    onError: PropTypes.func,
    supportGpuSelect: PropTypes.bool,
  }

  static defaultProps = {
    value: {},
    onChange() {},
    onError() {},
    cpuProps: {},
    memoryProps: {},
    supportGpuSelect: false,
  }

  constructor(props) {
    super(props)

    this.nodeStore = new NodeStore()
    this.gpuMigProfilesStore = new GpuMigProfilesStore()

    this.state = {
      ...ResourceLimit.getValue(props),
      defaultValue: props.defaultValue,
      cpuError: '',
      memoryError: '',
      workspaceLimitCheck: {},
      gpuTypeList: [],
      gpuTypeOption: [],
      gpuSliceOption: [],      
    }
  }

  async componentDidMount() {
    await this.fetchGpuTypeListData() 
  }

  fetchGpuTypeListData = async () => {
    const gpuTypeList =  await request.get('/gpucatalog/all')

    const gpuTypeListConvert = await gpuTypeList.map(item => {
      const [gpuType, memory] = item.alias.split(' ')
      return {
        name: item.name,
        gpuType,
        memory,
        count: item.count,
        deviceID: item.deviceID,
        nodeName: item.nodeName
      }
    })
        
    const uniqueData = await  gpuTypeListConvert.filter(
      (item, index, self) =>
        index === self.findIndex(obj => obj.name === item.name)
    )

    const gpuTypeOption = uniqueData.map(el => {
      return {
        label: el.gpuType,
        value: el.gpuType,
      }
    })

    const gpuSliceOption = await this.getGpuSliceOption(uniqueData[0].gpuType)

    this.setState({
      gpuType: uniqueData[0].gpuType,
      gpuTypeList: uniqueData,
      gpuTypeOption: gpuTypeOption,
      gpuTypeDefaultOption: uniqueData[0].gpuType,
      gpuSliceOption: gpuSliceOption
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      prevProps.isEdit &&
      !this.props.isEdit &&
      isEqual(prevProps.defaultValue, prevState.defaultValue)
    ) {
      this.setState({
        ...ResourceLimit.getValue(this.props),
        defaultValue: this.props.defaultProps,
      })
    }
  }

  static getDerivedStateFromProps(props, state) {
    if (
      !isEqual(props.defaultValue, state.defaultValue) ||
      !isEqual(props.workspaceLimitProps, state.workspaceLimitProps)
    ) {
      return {
        ...ResourceLimit.getValue(props),
        defaultValue: props.defaultValue,
        workspaceLimitProps: props.workspaceLimitProps,
      }
    }

    return null
  }

  static allowInputDot(formatNum, unit, formatFn, isMemory = false) {
    if (formatNum === Infinity) {
      return formatNum
    }

    const inputNum = formatNum && isMemory ? formatNum.slice(0, -2) : formatNum

    if (inputNum && String(inputNum).endsWith('.')) {
      const number = formatFn(formatNum, unit)
      return `${number}.`
    }

    if (inputNum && String(inputNum).endsWith('.0')) {
      const number = formatFn(formatNum, unit)
      return `${number}.0`
    }

    return formatFn(formatNum, unit)
  }

  static getValue(props) {
    const cpuUnit = get(props, 'cpuProps.unit', 'Core')
    const memoryUnit = get(props, 'memoryProps.unit', 'Mi')

    const requestCpu = ResourceLimit.getDefaultRequestValue(props, 'cpu')
    const requestMeo = ResourceLimit.getDefaultRequestValue(props, 'memory')
    const limitCpu = ResourceLimit.getDefaultLimitValue(props, 'cpu')
    const limitMeo = ResourceLimit.getDefaultLimitValue(props, 'memory')

    const cpuRequests = ResourceLimit.allowInputDot(
      requestCpu,
      cpuUnit,
      cpuFormat
    )

    const memoryRequests = ResourceLimit.allowInputDot(
      requestMeo,
      memoryUnit,
      memoryFormat,
      true
    )

    const cpuLimits = ResourceLimit.allowInputDot(limitCpu, cpuUnit, cpuFormat)

    const memoryLimits = ResourceLimit.allowInputDot(
      limitMeo,
      memoryUnit,
      memoryFormat,
      true
    )

    const workspaceReqMeo = memoryFormat(
      `${ResourceLimit.getWorkspaceRequestLimit(props, 'memory')}Mi`,
      memoryUnit
    )

    const workspaceMeoLimit = memoryFormat(
      `${ResourceLimit.getWorkspaceLimitValue(props, 'memory')}Mi`,
      memoryUnit
    )

    const workspaceCpuRequests = cpuFormat(
      ResourceLimit.getWorkspaceRequestLimit(props, 'cpu'),
      cpuUnit
    )

    const workspaceCpuLimits = cpuFormat(
      ResourceLimit.getWorkspaceLimitValue(props, 'cpu'),
      cpuUnit
    )

    return {
      requests: {
        cpu: cpuRequests,
        memory: memoryRequests,
      },
      limits: {
        cpu: cpuLimits,
        memory: memoryLimits,
      },
      workspaceRequests: {
        cpu: isNaN(workspaceCpuRequests) ? 'Not Limited' : workspaceCpuRequests,
        memory: isNaN(workspaceReqMeo) ? 'Not Limited' : workspaceReqMeo,
      },
      workspaceLimits: {
        cpu: isNaN(workspaceCpuLimits) ? 'Not Limited' : workspaceCpuLimits,
        memory: isNaN(workspaceMeoLimit) ? 'Not Limited' : workspaceMeoLimit,
      },
      gpu: ResourceLimit.gpuSetting(props),
      gpuType: '',
      gpuSliceValue: ResourceLimit.gpuSliceSetting(props, 'K') || '',
      gpuSliceCount: ResourceLimit.gpuSliceSetting(props, 'V') || 0,
      gpuSliceSelected: ResourceLimit.gpuSliceSetting(props, 'S') || false,
      gpuSliceMaxCount: ResourceLimit.gpuSliceSetting(props, 'M') || 0,
    }
  }

  static gpuSliceSetting(props, type) {
    const value = get(props, 'value', {})    
    
    const requests = value.requests || {}
    const options = value.gpusliceoptions || []

    for (const [key, val] of Object.entries(requests)) {
      if (key.includes("nvidia")) {

        if (type === "K") { return key.toUpperCase() }
        if (type === "V") { return Number(val) }

        if (type === "M") {
          const upperKey = key.toUpperCase()
          const found = options.find( option => option.label === upperKey)
          const [count] = found.value.split("|")
          return Number(count)
        }
        return true
      }
    }

    return undefined
  }
  
  static getGpuFromProps(value) {
    // get gpu config from requests field
    const supportGpuType = globals.config.supportGpuType
    if (!value) {
      return {
        type: supportGpuType[0],
        value: '',
      }
    }
    // The value may not have requests field
    const types = Object.keys(get(value, 'requests', {})).filter(key =>
      supportGpuType.some(item => key.endsWith(item))
    )
    const type = !isEmpty(types) ? types[0] : supportGpuType[0]
    return {
      type,
      value: !isEmpty(types) ? value.requests[`${type}`] : '',
    }
  }

  static gpuSetting(props) {
    const value = get(props, 'value', {})
    const defaultValue = get(props, 'defaultValue', {})

    if (!isEmpty(value)) {
      return ResourceLimit.getGpuFromProps(value)
    }
    if (!isEmpty(defaultValue)) {
      return ResourceLimit.getGpuFromProps(defaultValue)
    }
    return ResourceLimit.getGpuFromProps()
  }

  static getDefaultRequestValue(props, key) {
    const value = get(
      props,
      `value.requests.${key}`,
      get(props, `defaultValue.requests.${key}`) ?? ''
    )
    return value
  }

  static getDefaultLimitValue(props, key) {
    return get(
      props,
      `value.limits.${key}`,
      get(props, `defaultValue.limits.${key}`) ?? Infinity
    )
  }

  static getWorkspaceRequestLimit(props, key) {
    return get(props, `workspaceLimitProps.requests.${key}`, 'Not Limited')
  }

  static getWorkspaceLimitValue(props, key) {
    return get(props, `workspaceLimitProps.limits.${key}`, 'Not Limited')
  }

  cpuFormatter = value => {
    if (value > 0 && value < 1) {
      return value.toFixed(2)
    }
    if (value > 1 && value !== Infinity) {
      return value.toFixed(1)
    }
    return value
  }

  memoryFormatter = value => {
    value = Math.round(value)
    if (value > 0 && value < 1000) {
      return value - (value % 10)
    }
    if (value > 1000 && value < 2000) {
      return value - (value % 50)
    }
    if (value > 2000 && value !== Infinity) {
      return value - (value % 100)
    }
    return value
  }

  get cpuUnit() {
    return this.props.cpuProps.unit || 'Core'
  }

  get memoryUnit() {
    return this.props.memoryProps.unit || 'Mi'
  }
  
  get gpuType() {
    return this.state.gpu.type
  }

  getLimit(value) {
    return isFinite(Number(value)) ? value : ''
  }

  getRequest(value) {
    return value === null || value === undefined ? '' : value
  }

  checkError = state => {
    let cpuError = ''
    let memoryError = ''
    const { requests, limits } = state

    if (
      limits.cpu &&
      !String(limits.cpu).endsWith('.') &&
      Number(requests.cpu) > Number(limits.cpu)
    ) {
      cpuError = 'RequestExceed'
    }

    if (
      limits.memory &&
      !String(limits.memory).endsWith('.') &&
      Number(requests.memory) > Number(limits.memory)
    ) {
      memoryError = 'RequestExceed'
    }

    return { cpuError, memoryError }
  }

  checkAndTrigger = () => {
    const {
      requests,
      limits,
      gpu,
      workspaceLimits: wsL,
      workspaceRequests: wsR,
    } = this.state

    this.setState(
      {
        workspaceLimitCheck: {
          requestCpuError: this.checkNumOutLimit(requests.cpu, wsR.cpu),
          requestMemoryError: this.checkNumOutLimit(
            requests.memory,
            wsR.memory
          ),
          limitCpuError: this.checkNumOutLimit(limits.cpu, wsL.cpu),
          limitMemoryError: this.checkNumOutLimit(limits.memory, wsL.memory),
          gpuLimitError: this.checkGpuOutOfLimit(gpu),
        },
      },
      this.triggerChange
    )
  }

  checkGpuOutOfLimit = gpu => {
    const { type } = gpu
    const limitsArr = get(this.props, `workspaceLimitProps.gpuLimit`, [])
    const limitRes = limitsArr.filter(item =>
      Object.keys(item)[0].endsWith(type)
    )
    const limit =
      limitRes.length > 0 ? Object.values(limitRes[0])[0] : 'Not Limited'
    return this.checkNumOutLimit(gpu.value, limit)
  }

  checkNumOutLimit = (num, limit) => {
    const { omitQuotaCheck = false } = this.props

    if (omitQuotaCheck) {
      return ''
    }

    if (limit !== 'Not Limited') {
      return isFinite(Number(num)) && Number(num) > limit
        ? 'workspaceRequestExceed'
        : ''
    }
    return ''
  }

  triggerChange = () => {
    const { onChange, onError } = this.props
    const {
      requests,
      limits,
      cpuError,
      memoryError,
      workspaceLimitCheck: wsL,
      gpu,
      gpuSliceOption,
    } = this.state
    const memoryUnit = this.memoryUnit
    const cpuUnit = this.cpuUnit === 'Core' ? '' : this.cpuUnit
    
    const errorList = this.getWorkspaceCheckError()
    errorList.length > 0
      ? onError(cpuError || memoryError || wsL[errorList[0]])
      : onError(cpuError || memoryError)

    const result = {}

    if (requests.cpu !== '' && requests.cpu >= 0 && requests.cpu < Infinity) {
      set(result, 'requests.cpu', `${requests.cpu}${cpuUnit}`)
    }

    if (
      requests.memory !== '' &&
      requests.memory >= 0 &&
      requests.memory < Infinity
    ) {
      set(result, 'requests.memory', `${requests.memory}${memoryUnit}`)
    }

    if (limits.cpu !== '' && limits.cpu >= 0 && limits.cpu < Infinity) {
      set(result, 'limits.cpu', `${limits.cpu}${cpuUnit}`)
    }
    if (
      limits.memory !== '' &&
      limits.memory >= 0 &&
      limits.memory < Infinity
    ) {
      set(result, 'limits.memory', `${limits.memory}${memoryUnit}`)
    }

    // pass gpu input config into limits and requests field
    if (!!gpu.type && !!gpu.value && !!gpu.label) {
      set(result, 'limits', { ...result.limits, [`${gpu.label}`]: String(gpu.value) })
      set(result, 'requests', {
        ...result.requests,
        [`${gpu.label}`]: String(gpu.value),
      })
    }

    set(result, 'gpusliceoptions', gpuSliceOption)
    
    console.log("result : "+ JSON.stringify(result))
    onChange(result)
  }

  getWorkspaceCheckError = () => {
    return Object.keys(this.state.workspaceLimitCheck).filter(
      key => this.state.workspaceLimitCheck[key] !== ''
    )
  }

  handleCPUChange = value => {
    this.setState(
      ({ requests, limits }) => ({
        requests: { ...requests, cpu: value[0] === 0 ? '' : value[0] },
        limits: { ...limits, cpu: value[1] === 0 ? '' : value[1] },
      }),
      this.checkAndTrigger
    )
  }

  handleMemoryChange = value => {
    this.setState(
      ({ requests, limits }) => ({
        requests: { ...requests, memory: value[0] === 0 ? '' : value[0] },
        limits: { ...limits, memory: value[1] === 0 ? '' : value[1] },
      }),
      this.checkAndTrigger
    )
  }

  handleInputChange = (e, value) => {
    let inputNum
    const name = e.target.name

    if (value === '' || value === undefined) {
      inputNum = ''
    } else {
      const number = /^(([1-9]{1}\d*)|(0{1}))(\.\d{0,2})?$/.exec(value)
      inputNum = number == null ? get(this.state, name, null) : number[0]
    }

    this.setState(state => {
      set(state, name, isNaN(inputNum) ? '' : inputNum)
      return { ...state, ...this.checkError(state) }
    }, this.checkAndTrigger)
  }

  handleGpuInputChange = (e, value) => {
    let inputNum
    if (value === '') {
      inputNum = ''
    } else {
      const number = /^(0|[1-9][0-9]*)$/.exec(value)
      inputNum = number == null ? get(this.state, 'gpu.value', '') : number[0]
    }
    this.setState(
      {
        gpu: {
          type: this.state.gpu.type,
          value: inputNum,
        },
      },
      this.checkAndTrigger
    )
  }

  getGpuSliceOption = async (type) => {
    const result = {};
    const nodes = await this.nodeStore.fetchList(); 

    nodes
      .filter(node =>
        node.labels?.["nvidia.com/gpu.product"]?.includes(type)
      )
      .forEach(node => {
        const allocatable = node.status?.allocatable || {};

        Object.entries(allocatable).forEach(([key, value]) => {
          if (key.startsWith("nvidia.com/")) {
            const numericValue = parseInt(value, 10);
            const newValue = `${numericValue}|${key}`;

            if (!result[key]) {
              result[key] = newValue;
            } else {
              // 기존 값에서 숫자 부분만 추출
              const existingNumber = parseInt(result[key].split("|")[0], 10);

              if (numericValue > existingNumber) {
                result[key] = newValue;
              }
            }
          }
        });
      });

    const options = Object.entries(result).map(([key, value]) => ({
      label: key.toUpperCase(),
      value: value,
    }));
 
    return options
  }

  gpuSelectChange = async (type) => {
    const gpuSliceOption = await this.getGpuSliceOption(type)

    this.setState(
      {
        gpuType: type,
        gpuSliceOption: gpuSliceOption
      },
      this.checkAndTrigger
    )
  }

  gpuSliceChange = (data) => {
    const [value, keyValue] = data.split("|")
    const maxValue = parseInt(value, 10) || 0;
    const type = keyValue.includes("gpu") ? "gpu" : "mig";

    this.setState(
      {
        gpu: {
          type,
          value: maxValue,
          label: keyValue
        },
        gpuSliceValue: keyValue.toUpperCase(),
        gpuSliceSelected: true,
        gpuSliceMaxCount: maxValue,
        gpuSliceCount: maxValue
      },
      this.triggerChange
    )
  }

  gpuSliceCountChange = (v) => {
    this.setState((prevState) => ({
      gpu: {
        ...prevState.gpu,   // 기존 type, label 유지
        value: v            // value만 새 값으로 변경
      },      
    }),
    this.triggerChange
    );
  }

  renderLimitTip = (value, unit) => {
    return value !== 'Not Limited' ? `${value} ${unit}` : t('NO_LIMIT')
  }

  renderGpuTip = () => {
    const { workspaceLimitProps: pWL } = this.props
    const { gpu } = this.state
    const findResult = pWL?.gpuLimit.filter(item => {
      return isEmpty(item) ? item : Object.keys(item)[0].endsWith(gpu.type)
    })[0]

    return (
      <div className={styles.message}>
        <span>{t('GPU_TYPE')}:</span>
        <span>{isUndefined(findResult) ? t('NO_LIMIT') : gpu.type}</span>
        <br />
        <span>{t('GPU_LIMIT')}:</span>
        <span>
          {isUndefined(findResult)
            ? t('NO_LIMIT')
            : Object.values(findResult)[0]}
        </span>
      </div>
    )
  }

  renderQuotasTip() {
    const { workspaceLimitProps: pWL, supportGpuSelect } = this.props
    const { workspaceLimits: wsL, workspaceRequests: wsR } = this.state
    const memoryUnit = this.memoryUnit
    const cpuUnit = this.cpuUnit

    const title = t('AVAILABLE_QUOTAS')

    const message = () => (
      <>
        <div>
          <div className={styles.message}>
            <span>{t('RESOURCE_REQUESTS')}:</span>
            <span>
              CPU&nbsp;
              {this.renderLimitTip(wsR.cpu, cpuUnit)},&nbsp;
              {t('MEMORY')}&nbsp;
              {this.renderLimitTip(wsR.memory, memoryUnit)}
            </span>
          </div>
          <div className={styles.message}>
            <span>{t('RESOURCE_LIMITS')}:</span>
            <span>
              CPU&nbsp;
              {this.renderLimitTip(wsL.cpu, cpuUnit)},&nbsp;
              {t('MEMORY')}&nbsp;
              {this.renderLimitTip(wsL.memory, memoryUnit)}
            </span>
          </div>
          {supportGpuSelect && pWL.gpuLimit && this.renderGpuTip()}
        </div>
      </>
    )

    return (
      <Alert
        title={title}
        type="info"
        className="margin-t12"
        message={message()}
      />
    )
  }

  get ifRenderTip() {
    const { workspaceLimitProps } = this.props
    return !isEmpty(workspaceLimitProps)
  }

  getMarks(max, min = 1) {
    max = max === 0 ? 1 : max

    const count = max < 5 ? max - min + 2 : 6

    return range(count).reduce((marks, index) => {
      const value = min + ((max - min) * index) / (count - 1)
      const mark = `${Math.round(value)}`
      return { ...marks, [Math.round(value)]: mark }
    }, {})
  }
  
  renderGpuSelect = () => {    

    return (
      <Column>
         <div className={styles.wrapper}>
            <div className={styles.inputGroup}>
              <img src="/assets/GPU.svg" size={48} />
              <div className={classnames(styles.input)}>
                <div className={styles.label}>
                  <span>{t('GPU_TYPE')}</span>
                </div>
                <div className={styles.selectBox}>
                   <Select
                    options={this.state.gpuTypeOption}
                    value={`${this.state.gpuTypeDefaultOption}`}
                    onChange={this.gpuSelectChange}
                    placeholder=" "
                  ></Select>
                </div>
                <div className={styles.selectBox}>
                   <Select
                    options={this.state.gpuSliceOption}
                    value={this.state.gpuSliceValue}
                    onChange={this.gpuSliceChange}
                    placeholder={t('RESOURCES_SELECT')}
                  ></Select>
                </div>
              </div>
            </div>
          
            {this.state.gpuSliceSelected && ( 
              <div key={1} className={styles.gpuGroup}>
                <div style={{ width: 48 }} />           
                <div className={styles.rowContainer}>
                  <div className={styles.leftArea}>
                    {/* GPU 제한 */}
                    <div className={styles.input}>
                      <div className={styles.label}>
                        {t("GPU_LIMIT")}
                      </div>
                    </div>
                    <div className={styles.input}>
                      <div className={styles.label}>
                      </div>
                      <div className={styles.inputBox}>
                        <UnitSlider
                            max={this.state.gpuSliceMaxCount}
                            min={1}
                            marks={this.getMarks(this.state.gpuSliceMaxCount, 1)}
                            unit={''}
                            value={this.state.gpuSliceCount == 0 ? this.state.gpuSliceMaxCount : this.state.gpuSliceCount}
                            withInput
                            onChange={(v) => {
                                this.gpuSliceCountChange(v)
                            }}
                          />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}     
          </div>
      </Column>
    )
  }

  render() {
    const { cpuError, memoryError, workspaceLimitCheck: limit } = this.state
    const { supportGpuSelect } = this.props
    const outWorkSpaceLimit = this.getWorkspaceCheckError()

    return (
      <div className={styles.wrapper}>
        <div className={styles.inputWrapper}>
          <Columns className="is-gapless">
            <Column>
              <div className={styles.inputGroup}>
                <Icon name="cpu" size={48} />
                <div
                  className={classnames(styles.input, {
                    [styles.error]: cpuError || limit.requestCpuError,
                  })}
                >
                  <span className={styles.label}>{t('CPU_REQUEST')}</span>
                  <div className={styles.inputBox}>
                    <Input
                      name="requests.cpu"
                      value={this.getRequest(this.state.requests.cpu)}
                      onChange={this.handleInputChange}
                      placeholder={t('NO_REQUEST')}
                    />
                    <span className={styles.unit}>{this.cpuUnit}</span>
                  </div>
                </div>
                <div
                  className={classnames(styles.input, {
                    [styles.error]: cpuError || limit.limitCpuError,
                  })}
                >
                  <span className={styles.label}>{t('CPU_LIMIT')}</span>
                  <div className={styles.inputBox}>
                    <Input
                      name="limits.cpu"
                      value={this.getLimit(this.state.limits.cpu)}
                      onChange={this.handleInputChange}
                      placeholder={t('NO_LIMIT')}
                    />
                    <span className={styles.unit}>{this.cpuUnit}</span>
                  </div>
                </div>
              </div>
            </Column>
            <Column>
              <div className={styles.inputGroup}>
                <Icon name="memory" size={48} />
                <div
                  className={classnames(styles.input, {
                    [styles.error]: memoryError || limit.requestMemoryError,
                  })}
                >
                  <span className={styles.label}>{t('MEMORY_REQUEST')}</span>
                  <div className={styles.inputBox}>
                    <Input
                      name="requests.memory"
                      value={this.getRequest(this.state.requests.memory)}
                      onChange={this.handleInputChange}
                      placeholder={t('NO_REQUEST')}
                    />
                    <span className={styles.unit}>{this.memoryUnit}</span>
                  </div>
                </div>
                <div
                  className={classnames(styles.input, {
                    [styles.error]: memoryError || limit.limitMemoryError,
                  })}
                >
                  <span className={styles.label}>{t('MEMORY_LIMIT')}</span>
                  <div className={styles.inputBox}>
                    <Input
                      name="limits.memory"
                      value={this.getLimit(this.state.limits.memory)}
                      onChange={this.handleInputChange}
                      placeholder={t('NO_LIMIT')}
                    />
                    <span className={styles.unit}>{this.memoryUnit}</span>
                  </div>
                </div>
              </div>
            </Column>
          </Columns>
          {supportGpuSelect && 
            <Columns className="is-gapless">
              <Column>{this.renderGpuSelect()}</Column>
            </Columns>
          }           
        </div>
        {this.ifRenderTip && this.renderQuotasTip()}
        {(cpuError || memoryError) && (
          <Alert
            type="error"
            className="margin-t12"
            message={t('REQUEST_EXCEED_LIMIT')}
          />
        )}
        {outWorkSpaceLimit.length > 0 && (
          <Alert
            type="error"
            className="margin-t12"
            message={t('REQUEST_EXCEED_AVAILABLE_QUOTA')}
          />
        )}
      </div>
    )
  }
}
