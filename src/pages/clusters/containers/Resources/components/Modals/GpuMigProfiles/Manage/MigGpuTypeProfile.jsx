import React, { useEffect, useState } from 'react'
import { get } from 'lodash'
import { Select, Button, Toggle } from '@kube-design/components'
import GpuMigProfilesStore from 'stores/resources/gpumigprofiles'
import styles from './index.scss'

const MigGpuTypeProfile = props => {
  const gpuMigProfilesStore = new GpuMigProfilesStore()

  const name = props.name
  const gpuType = props.gpuType
  const totalGpuCount = props.totalGpuCount
  const sliceType = props.sliceType
  const deviceId = props.deviceId
  const mode = props.mode
  const modifyData = props.modifyData

  const maxGpuNum =
    mode === 'edit'
      ? modifyData.gpuCount.includes('all')
        ? 1
        : Number(Math.max(...modifyData?.gpuCount)) + 1
      : 0

  const [openDropdownId, setOpenDropdownId] = useState(null)
  const [selectedSlice, setSelectedSlice] = useState({})

  const [isBatch, setIsBatch] = useState(
    mode === 'edit'
      ? !!(sliceType === 'B' || modifyData.gpuCount[0] === 'all')
      : sliceType === 'B'
  )

  const [gpuCount, setGpuCount] = useState(mode === 'edit' ? maxGpuNum : 0)
  const [totalSmCount, setTotalSmCount] = useState(7)
  const [totalMemory, setTotalMemory] = useState(0)

  const [sliceLayout, setSliceLayout] = useState([])

  useEffect(() => {
    const getMigConfigTemplateData = async () => {
      const resultCustomMigConfig = await gpuMigProfilesStore.getCustomMigConfig()

      const params = {
        type: 'N',
        name,
        deviceId,
      }

      const migConfigTemplateData = await gpuMigProfilesStore.getMigConfigTemplate(
        params,
        resultCustomMigConfig
      )

      setTotalSmCount(migConfigTemplateData.count)
      setTotalMemory(migConfigTemplateData.memory)
    }

    const getMigLayoutData = async () => {
      const params = {
        name,
      }
      const migLayout = await gpuMigProfilesStore.getMigLayout(params)

      const migLayoutData = migLayout.map(profile => ({
        id: profile.id,
        slices: profile['mig-devices'].map(item => item.name),
      }))
      console.log("migLayoutData : "+ JSON.stringify(migLayoutData))
      setSliceLayout(migLayoutData)
    }

    getMigConfigTemplateData()
    getMigLayoutData()
  }, [])

  useEffect(() => {
    if (mode === 'edit') {
      initSelectedSlice()
    }
  }, [sliceLayout])

  useEffect(() => {
    const gpuTypeData = {
      type: gpuType,
      sliceType,
      sliceCount: isBatch ? '1' : gpuCount,
      deviceId,
      data: Object.keys(selectedSlice).map(key => ({
        name: key,
        deviceIndex:
          key === 'ALL' ? 'all' : parseInt(key.replace(/\D/g, ''), 10) - 1,
        ...selectedSlice[key],
      })),
    }

    // 부모 컴포넌트에 값 전달
    props.handleGpuTypeData(gpuTypeData)
  }, [selectedSlice])

  const gpuCountOption = Array.from({ length: totalGpuCount }, (_, i) => ({
    label: String(i + 1),
    value: String(i + 1),
  }))

  const initSelectedSlice = () => {
    const modifySelectedSlice = {}

    modifyData.gpuTypeDetail.forEach(item => {
      const groupKey = Object.keys(item)[0]
      const devices = Object.values(item)[0]
      const num = String(groupKey.split('_')[1]).padStart(2, '0')
      const gpuName = num === 'all' ? 'ALL' : `GPU${num}`

      const sliceArray = []
      Object.entries(devices ?? {}).forEach(([sliceKey, count]) => {
        const [gStr, memoryStr] = sliceKey.replace(/_\d+$/, '').split('.')
        const g = parseInt(gStr.replace('g', ''), 10)
        for (let i = 0; i < count; i++) {
          sliceArray.push(`${g}g.${memoryStr}`)
        }
      })

      const rowData = sliceLayout.find(
        row =>
          row.slices.length === sliceArray.length &&
          row.slices.every((v, i) => v === sliceArray[i])
      )

      modifySelectedSlice[gpuName] = rowData
    })

    setSelectedSlice(modifySelectedSlice)
  }

  const handleDelete = gpuName => {
    setSelectedSlice(prev => {
      const newState = { ...prev }
      delete newState[gpuName]
      return newState
    })

    if (openDropdownId === gpuName) {
      setOpenDropdownId(null)
    }
  }

  const handlechangeBatch = () => {
    if (isBatch) {
      setGpuCount(0)
    }
    setIsBatch(prev => !prev)
    setSelectedSlice({})
    setOpenDropdownId(null)
  }

  const handlechangeGpuCount = e => {
    setGpuCount(e)
    setSelectedSlice({})
    setOpenDropdownId(null)
  }

  const calcSliceValues = sliceArray => {
    let addCount = 0
    let addMemory = 0

    sliceArray.forEach(item => {
      const [gPart, memPart] = item.split('.')
      addCount += parseInt(gPart.replace('g', ''), 10)
      addMemory += parseInt(memPart.replace('gb', ''), 10)
    })

    return { addCount, addMemory }
  }

  const MIGSliceGpu = ({ gpuName = 'GPU' }) => {
    const isOpen = openDropdownId === gpuName
    const selectedIndex = selectedSlice[gpuName]

    let gpuSlices = []
    let smCount = 0
    let memory = 0

    const isExistData = Object.keys(selectedSlice).includes(gpuName)

    if (isExistData) {
      gpuSlices = get(selectedSlice, [gpuName, 'slices'], [])
      ;({ addCount: smCount, addMemory: memory } = calcSliceValues(gpuSlices))
    }

    return (
      <section className="gpu_mig_box">
        <header className="gpu_mig_header">
          <h2 className="gpu_mig_gpu_title">{gpuName}</h2>
          <nav className="gpu_mig_status">
            <div className="status_item">
              <span className="label">SM</span>
              <span className="number">
                <strong>{smCount}</strong>/<small>{totalSmCount}</small>
              </span>
            </div>
            <div className="status_item">
              <span className="label">{t('RESOURCES_MEMORY')}</span>
              <span className="number">
                <strong>{memory}</strong>/<small>{totalMemory}</small>
              </span>
            </div>
          </nav>
        </header>
        {/* gpu slice 선택 전 */}
        <ul className={`mig_bar_chart ${!isExistData ? '' : 'hide'}`}>
          <li
            className={`profile empty ${isOpen ? 'active' : ''}`}
            onClick={e => {
              e.stopPropagation()
              setOpenDropdownId(gpuName)
            }}
          >
            <div>
              <span>0</span>
            </div>
            {isOpen && (
              <div className="mig_slice_dropdown show">
                <div className="mig_slice_dropdown_header">
                  <div className="mig_slice_dropdown_title">
                    <span className="title_text">
                      {t('RESOURCES_SELECT_SLICE')}
                    </span>
                    <span className="gpu_tag">{gpuName || 'GPU'}</span>
                  </div>
                  <button
                    className="mig_slice_dropdown_close"
                    onClick={e => {
                      e.stopPropagation()
                      setOpenDropdownId(null)
                    }}
                  >
                    <i className="ico-close"></i>
                  </button>
                </div>

                <div className="mig_slice_dropdown_content">
                  {sliceLayout.length > 0 &&
                    sliceLayout.map(row => (
                      <div
                        key={row.id}
                        className={`${styles.migSliceRow} mig_slice_row ${
                          selectedIndex === row.id ? 'selected' : ''
                        }`}
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedSlice(prev => ({
                            ...prev,
                            [gpuName]: row,
                          }))
                        }}
                      >
                        <button className="mig_slice_row_num">{row.id}</button>
                        <ul className="mig_bar_chart">
                          {row.slices.map((item, index) => {
                            const cssValue = item.includes('.')
                              ? item.split('.')[0]
                              : item
                            return (
                              <li
                                key={index}
                                className={`profile p_${cssValue}`}
                              >
                                <div>
                                  <span className={styles.textDefault}>
                                    {cssValue}
                                  </span>
                                  <span className={styles.textHover}>
                                    {item}
                                  </span>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </li>
        </ul>

        {/* gpu slice 선택 후 */}
        <ul className={`mig_bar_chart ${isExistData ? '' : 'hide'}`}>
          {gpuSlices.map((item, index) => {
            const parts = item.split('.')
            const value = parts[0] || item
            return (
              <li key={`${gpuName}_${index}`} className={`profile p_${value}`}>
                <div>
                  <span>{item}</span>
                </div>
              </li>
            )
          })}

          <li style={{ padding: '6px', cursor: 'pointer' }}>
            <i
              className="ico-close"
              onClick={e => {
                e.stopPropagation()
                handleDelete(gpuName)
              }}
            ></i>
          </li>
        </ul>
      </section>
    )
  }

  return (
    <div className="gpu_mig_secter">
      <div className="header_area">
        <div className="title">
          <span>{gpuType}</span>
          <span className="desc">
            {isBatch ? t('RESOURCES_BATCH_PROCESS_TIP') : '\u200B'}
          </span>
        </div>
        <div className="control">
          <span>{t('RESOURCES_BATCH_PROCESS')}</span>
          <Toggle
            checked={isBatch}
            onChange={() => handlechangeBatch()}
            disabled={sliceType === 'B'}
          />
          <Select
            key={isBatch}
            name="gpuCount"
            defaultValue={mode === 'edit' ? maxGpuNum : undefined}
            placeholder={t('RESOURCES_GPU_COUNT')}
            options={gpuCountOption}
            style={{ maxWidth: '100px' }}
            disabled={isBatch}
            onChange={e => handlechangeGpuCount(e)}
          />
          <Button
            type="flat"
            icon="trash"
            onClick={() => {
              props.handleRemoveGpuType(gpuType)
            }}
          />
        </div>
      </div>

      {Number(gpuCount) < 1 && isBatch === false && (
        <div className="gpu_mig_secter">
          <div className={styles.empty}>{t('RESOURCES_GPU_SLICE_NO_DATA')}</div>
        </div>
      )}

      {(Number(gpuCount) > 0 || isBatch) && (
        <div className="create">
          {isBatch ? (
            <MIGSliceGpu gpuName="ALL" />
          ) : (
            // isBatch = false → gpuCount 숫자만큼 GPU01, GPU02 … 렌더링
            Array.from({ length: Number(gpuCount) }, (_, idx) => {
              const num = String(idx + 1).padStart(2, '0') // GPU01 형식
              return <MIGSliceGpu key={num} gpuName={`GPU${num}`} />
            })
          )}
        </div>
      )}
    </div>
  )
}

export default MigGpuTypeProfile
