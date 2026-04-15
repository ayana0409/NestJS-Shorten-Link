import { Model } from "mongoose";

export const buildSearchQuery = (
  search?: string,
  fields: string[] = [],
): Record<string, unknown> => {
  if (!search || fields.length === 0) {
    return {};
  }

  const regex = { $regex: search, $options: "i" };
  if (fields.length === 1) {
    return { [fields[0]]: regex };
  }

  return { $or: fields.map((field) => ({ [field]: regex })) };
};

export const buildSort = (
  sortBy = "createdAt",
  sortOrder = "desc",
): Record<string, 1 | -1> => {
  const sort: Record<string, 1 | -1> = {};
  sort[sortBy] = sortOrder === "asc" ? 1 : -1;
  return sort;
};

export const paginateModel = <T>(
  model: Model<T>,
  query: Record<string, unknown>,
  sort: Record<string, 1 | -1>,
  page = 1,
  limit = 5,
  projection?: Record<string, unknown> | string,
) => {
  const skip = (page - 1) * limit;
  return model
    .find(query, projection)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .exec();
};
