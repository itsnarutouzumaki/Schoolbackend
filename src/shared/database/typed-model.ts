import {
  model,
  models,
  type Model,
  type Schema,
} from 'mongoose';

export function getTypedModel<TRawDocType>(
  name: string,
  schema: Schema,
): Model<TRawDocType> {
  const existingModel = models[name];
  if (existingModel) {
    return existingModel as Model<TRawDocType>;
  }
  return model<TRawDocType>(name, schema as Schema<TRawDocType>);
}
