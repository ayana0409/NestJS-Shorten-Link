import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Level, LevelDocument } from "./schemas/level.schema";
import { CreateLevelDto } from "./dto/create-level.dto";
import { UpdateLevelDto } from "./dto/update-level.dto";
import {
  buildSearchQuery,
  buildSort,
  paginateModel,
} from "../common/pagination";

@Injectable()
export class LevelService {
  constructor(
    @InjectModel(Level.name) private levelModel: Model<LevelDocument>,
  ) {}

  async create(createLevelDto: CreateLevelDto): Promise<Level> {
    const createdLevel = new this.levelModel(createLevelDto);
    return createdLevel.save();
  }

  async findAll(): Promise<Level[]> {
    return this.levelModel.find().exec();
  }

  async findAllPaginated(
    search?: string,
    sortBy = "name",
    sortOrder = "asc",
    page = 1,
    limit = 10,
  ) {
    const query = buildSearchQuery(search, ["name"]);
    const sort = buildSort(sortBy, sortOrder);

    const levels = await paginateModel(
      this.levelModel,
      query,
      sort,
      page,
      limit,
    );
    const total = await this.levelModel.countDocuments(query).exec();

    return { levels, total };
  }

  async findOne(id: string): Promise<Level> {
    const level = await this.levelModel.findById(id).exec();
    if (!level) {
      throw new NotFoundException(`Level with ID ${id} not found`);
    }
    return level;
  }

  async update(id: string, updateLevelDto: UpdateLevelDto): Promise<Level> {
    const updatedLevel = await this.levelModel
      .findByIdAndUpdate(id, updateLevelDto, { new: true })
      .exec();
    if (!updatedLevel) {
      throw new NotFoundException(`Level with ID ${id} not found`);
    }
    return updatedLevel;
  }

  async remove(id: string): Promise<void> {
    const result = await this.levelModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Level with ID ${id} not found`);
    }
  }
}
