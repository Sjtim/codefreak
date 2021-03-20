import { InputNumber, Switch } from 'antd'
import { InputNumberProps } from 'antd/es/input-number'
import React, { useCallback, useEffect, useState } from 'react'
import './GradeDefinitionInputField.less'
import {
  GradeDefinition,
  GradeDefinitionInput,
  useUpdateGradeDefinitionValuesMutation
} from '../../generated/graphql'
import HelpTooltip from '../HelpTooltip'
import { debounce } from 'ts-debounce'

const renderGradePoints = (
  title: string,
  value: number,
  onChange: (value: number) => void,
  additionalProps: InputNumberProps = {}
) => {
  const onChangeValid = (val: number | undefined) =>
    val !== undefined ? onChange(val) : undefined

  const parser = (val: string | undefined) => {
    if (!val) {
      return '0'
    }

    return val.replace(/[^\d]+/, '0')
  }
  const formatter = (val: string | number | undefined) => `${val}`

  return (
    <InputNumber
      title={title}
      min={0}
      onChange={onChangeValid}
      value={value}
      parser={parser}
      formatter={formatter}
      inputMode={'numeric'}
      {...additionalProps}
    />
  )
}

const renderGradeErrors = (
  title: string,
  value: number,
  max: number,
  onChange: (value: number) => void,
  additionalProps: InputNumberProps = {}
) => {
  const onChangeValid = (val: number | undefined) =>
    val !== undefined ? onChange(val) : undefined

  const parser = (val: string | undefined) => {
    if (!val) {
      return '0'
    }
    // (?:\d+(?:\.\d*)?|\.\d+) <- für Float
    /// [^\d]+/ <- decimal
    return val.replace(/[^\d]+/, '0')
  }
  const formatter = (val: string | number | undefined) => `${val}`

  return (
    <InputNumber
      title={title}
      min={0}
      max={max}
      onChange={onChangeValid}
      value={value}
      parser={parser}
      formatter={formatter}
      {...additionalProps}
    />
  )
}

/**
 * Inputform to Enter and Mutate a GradeDefinition
 *
 */
const GradeDefinitionInputField: React.FC<{
  gradeDefinition: GradeDefinition
  fetchForUpdate: any
  disable: boolean
}> = props => {
  const [updateMutation] = useUpdateGradeDefinitionValuesMutation({
    onCompleted: () => {
      props.fetchForUpdate()
    }
  })

  const [globalField, setGlobalField] = useState<
    keyof GradeDefinitionInput | null
  >(null)

  const [gradeDefinition, setGradeDefinition] = useState<GradeDefinition>(
    props.gradeDefinition || {
      pEvalMax: 0,
      bOnMinor: 0,
      bOnMajor: 0,
      bOnCritical: 0
    }
  )

  const [input, setGradeDefinitionInput] = useState<GradeDefinitionInput>()
  // TODO updates two times, due to gradeDefinition Dependency her and useEffekt for memorizeCallback. Better approach required.
  useEffect(() => {
    setGradeDefinitionInput({
      criticalError: gradeDefinition.criticalError,
      majorError: gradeDefinition.majorError,
      minorError: gradeDefinition.minorError,
      id: gradeDefinition.id,
      maxPoints: gradeDefinition.maxPoints
    })
  }, [gradeDefinition])

  const memoizedCallback = useCallback(() => {
    if (globalField !== null) {
      if (input !== undefined)
        debounce(updateMutation({ variables: { input } }).then, 500)
    }
  }, [globalField, updateMutation, input])

  useEffect(() => {
    memoizedCallback()
  }, [gradeDefinition, memoizedCallback])

  const [changeable, setChangeable] = useState<boolean>(false)

  const onEnabledChange = (state: boolean) => {
    setChangeable(state)
  }

  const createOnValueChange = (field: keyof GradeDefinitionInput) => (
    value: number
  ) => {
    const valueOfKey = { ...gradeDefinition, [field]: value }
    setGlobalField(field)
    setGradeDefinition(valueOfKey)
  }

  return (
    <div className="grade-definition-input">
      <div className="maxPointsInput">
        {renderGradePoints(
          'Max-Points',
          gradeDefinition.maxPoints,
          createOnValueChange('maxPoints'),
          {
            disabled: !changeable
          }
        )}
      </div>
      <div className="maxPoints">Max-Points</div>
      <div className="minorErrorInput">
        {renderGradeErrors(
          'Minor-Error',
          gradeDefinition.minorError,
          gradeDefinition.maxPoints,
          createOnValueChange('minorError'),
          {
            disabled: !changeable
          }
        )}
      </div>
      <div className="minorError">Minor-Error</div>
      <div className="majorErrorInput">
        {renderGradeErrors(
          'Major-Error',
          gradeDefinition.majorError,
          gradeDefinition.maxPoints,
          createOnValueChange('majorError'),
          {
            disabled: !changeable
          }
        )}
      </div>
      <div className="majorError">Major-Error</div>
      <div className="criticalErrorInput">
        {renderGradeErrors(
          'Critical-Error',
          gradeDefinition.criticalError,
          gradeDefinition.maxPoints,
          createOnValueChange('criticalError'),
          {
            disabled: !changeable
          }
        )}
      </div>
      <div className="criticalError">Critical-Error</div>
      <div className="grade-definition-unlock">
        <Switch
          defaultChecked={changeable}
          onChange={onEnabledChange}
          disabled={props.disable}
        />
        <HelpTooltip placement="top" title="unlock fields" />
      </div>
    </div>
  )
}

export default GradeDefinitionInputField
