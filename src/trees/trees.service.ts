import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { trees, treeRecords, sites, userSpecies, species, users, projectMembers } from '../database/schema';
import { CreateTreeDto, UpdateTreeDto, BulkCreateTreeDto, TreeQueryDto } from './dto';
import { CreateTreeRecordDto, UpdateTreeRecordDto } from './dto/tree-record.dto';
import { TreeResponseDto, TreeRecordResponseDto, PaginatedTreeResponseDto } from './dto/tree-response.dto';
import { eq, and, ilike, desc, asc, count, inArray } from 'drizzle-orm';

@Injectable()
export class TreeService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(createTreeDto: CreateTreeDto, userId: string): Promise<TreeResponseDto> {
    // Verify user has access to the site
    await this.verifySiteAccess(createTreeDto.siteId, userId);

    // Verify userSpeciesId exists and belongs to user if provided
    if (createTreeDto.userSpeciesId) {
      await this.verifyUserSpeciesAccess(createTreeDto.userSpeciesId, userId);
    }

    const [newTree] = await this.drizzle.db
      .insert(trees)
      .values({
        ...createTreeDto,
        createdById: userId,
        images: createTreeDto.images || [],
      })
      .returning();

    return this.findOne(newTree.id, userId);
  }

  async bulkCreate(bulkCreateDto: BulkCreateTreeDto, userId: string): Promise<TreeResponseDto[]> {
    const { trees: treesToCreate } = bulkCreateDto;

    // Verify all sites belong to user's projects
    const siteIds = [...new Set(treesToCreate.map(tree => tree.siteId))];
    for (const siteId of siteIds) {
      await this.verifySiteAccess(siteId, userId);
    }

    // Verify all userSpeciesIds belong to user
    const userSpeciesIds = [...new Set(treesToCreate
      .filter(tree => tree.userSpeciesId)
      .map(tree => tree.userSpeciesId!))];
    
    for (const userSpeciesId of userSpeciesIds) {
      await this.verifyUserSpeciesAccess(userSpeciesId, userId);
    }

    const newTrees = await this.drizzle.db
      .insert(trees)
      .values(treesToCreate.map(tree => ({
        ...tree,
        createdById: userId,
        images: tree.images || [],
      })))
      .returning();

    const treeIds = newTrees.map(tree => tree.id);
    return this.findByIds(treeIds, userId);
  }

  async findAll(query: TreeQueryDto, userId: string): Promise<PaginatedTreeResponseDto> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions: any[] = [];
    
    if (query.siteId) {
      await this.verifySiteAccess(query.siteId, userId);
      conditions.push(eq(trees.siteId, query.siteId));
    } else {
      // If no specific site, filter by user's accessible sites
      const userSites = await this.getUserAccessibleSites(userId);
      conditions.push(inArray(trees.siteId, userSites.map(site => site.id)));
    }

    if (query.userSpeciesId) {
      conditions.push(eq(trees.userSpeciesId, query.userSpeciesId));
    }

    if (query.status) {
      conditions.push(eq(trees.status, query.status));
    }

    if (query.identifier) {
      conditions.push(ilike(trees.identifier, `%${query.identifier}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [totalResult] = await this.drizzle.db
      .select({ count: count() })
      .from(trees)
      .where(whereClause);

    // Get paginated data
    const orderBy = sortOrder === 'asc' ? asc(trees[sortBy]) : desc(trees[sortBy]);
    
    const treeData = await this.drizzle.db
      .select()
      .from(trees)
      .leftJoin(sites, eq(trees.siteId, sites.id))
      .leftJoin(userSpecies, eq(trees.userSpeciesId, userSpecies.id))
      .leftJoin(species, eq(userSpecies.speciesId, species.id))
      .leftJoin(users, eq(trees.createdById, users.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const formattedTrees = treeData.map(row => this.formatTreeResponse(row));

    return {
      data: formattedTrees,
      total: totalResult.count,
      page,
      limit,
      totalPages: Math.ceil(totalResult.count / limit),
    };
  }

  async findOne(id: string, userId: string): Promise<TreeResponseDto> {
    const treeData = await this.drizzle.db
      .select()
      .from(trees)
      .leftJoin(sites, eq(trees.siteId, sites.id))
      .leftJoin(userSpecies, eq(trees.userSpeciesId, userSpecies.id))
      .leftJoin(species, eq(userSpecies.speciesId, species.id))
      .leftJoin(users, eq(trees.createdById, users.id))
      .where(eq(trees.id, id))
      .limit(1);

    if (!treeData.length) {
      throw new NotFoundException('Tree not found');
    }

    const tree = treeData[0];
    
    // Verify user has access to this tree's site
    await this.verifySiteAccess(tree.trees.siteId, userId);

    return this.formatTreeResponse(tree);
  }

  async findByIds(ids: string[], userId: string): Promise<TreeResponseDto[]> {
    const treeData = await this.drizzle.db
      .select()
      .from(trees)
      .leftJoin(sites, eq(trees.siteId, sites.id))
      .leftJoin(userSpecies, eq(trees.userSpeciesId, userSpecies.id))
      .leftJoin(species, eq(userSpecies.speciesId, species.id))
      .leftJoin(users, eq(trees.createdById, users.id))
      .where(inArray(trees.id, ids));

    // Verify user has access to all trees' sites
    const siteIds = [...new Set(treeData.map(row => row.trees.siteId))];
    for (const siteId of siteIds) {
      await this.verifySiteAccess(siteId, userId);
    }

    return treeData.map(row => this.formatTreeResponse(row));
  }

  async update(id: string, updateTreeDto: UpdateTreeDto, userId: string): Promise<TreeResponseDto> {
    const existingTree = await this.findOne(id, userId);

    // If siteId is being changed, verify access to new site
    if (updateTreeDto.siteId && updateTreeDto.siteId !== existingTree.siteId) {
      await this.verifySiteAccess(updateTreeDto.siteId, userId);
    }

    // If userSpeciesId is being changed, verify access
    if (updateTreeDto.userSpeciesId && updateTreeDto.userSpeciesId !== existingTree.userSpeciesId) {
      await this.verifyUserSpeciesAccess(updateTreeDto.userSpeciesId, userId);
    }

    await this.drizzle.db
      .update(trees)
      .set({
        ...updateTreeDto,
        updatedAt: new Date(),
      })
      .where(eq(trees.id, id));

    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId); // This verifies access
    
    await this.drizzle.db
      .delete(trees)
      .where(eq(trees.id, id));
  }

  async bulkRemove(ids: string[], userId: string): Promise<void> {
    // Verify access to all trees
    await this.findByIds(ids, userId);
    
    await this.drizzle.db
      .delete(trees)
      .where(inArray(trees.id, ids));
  }

  // Tree Records methods
  async createRecord(createRecordDto: CreateTreeRecordDto, userId: string): Promise<TreeRecordResponseDto> {
    // Verify user has access to the tree
    await this.findOne(createRecordDto.treeId, userId);

    const [newRecord] = await this.drizzle.db
      .insert(treeRecords)
      .values({
        ...createRecordDto,
        createdById: userId,
        recordDate: createRecordDto.recordDate ? new Date(createRecordDto.recordDate) : new Date(),
      })
      .returning();

    return this.findOneRecord(newRecord.id, userId);
  }

  async findRecords(treeId: string, userId: string): Promise<TreeRecordResponseDto[]> {
    // Verify user has access to the tree
    await this.findOne(treeId, userId);

    const recordData = await this.drizzle.db
      .select()
      .from(treeRecords)
      .leftJoin(users, eq(treeRecords.createdById, users.id))
      .where(eq(treeRecords.treeId, treeId))
      .orderBy(desc(treeRecords.recordDate));

    return recordData.map(row => this.formatTreeRecordResponse(row));
  }

  async findOneRecord(id: string, userId: string): Promise<TreeRecordResponseDto> {
    const recordData = await this.drizzle.db
      .select()
      .from(treeRecords)
      .leftJoin(users, eq(treeRecords.createdById, users.id))
      .leftJoin(trees, eq(treeRecords.treeId, trees.id))
      .where(eq(treeRecords.id, id))
      .limit(1);

    if (!recordData.length) {
      throw new NotFoundException('Tree record not found');
    }

    const record = recordData[0];
    
    // Verify user has access to the tree
    await this.verifySiteAccess(record.trees!.siteId, userId);

    return this.formatTreeRecordResponse(record);
  }

  async updateRecord(id: string, updateRecordDto: UpdateTreeRecordDto, userId: string): Promise<TreeRecordResponseDto> {
    await this.findOneRecord(id, userId); // This verifies access

    await this.drizzle.db
      .update(treeRecords)
      .set({
        ...updateRecordDto,
        recordDate: updateRecordDto.recordDate ? new Date(updateRecordDto.recordDate) : undefined,
      })
      .where(eq(treeRecords.id, id));

    return this.findOneRecord(id, userId);
  }

  async removeRecord(id: string, userId: string): Promise<void> {
    await this.findOneRecord(id, userId); // This verifies access
    
    await this.drizzle.db
      .delete(treeRecords)
      .where(eq(treeRecords.id, id));
  }

  // Helper methods
  private async verifySiteAccess(siteId: string, userId: string): Promise<void> {
    const siteData = await this.drizzle.db
      .select({
        siteId: sites.id,
        projectId: sites.projectId,
      })
      .from(sites)
      .leftJoin(projectMembers, eq(sites.projectId, projectMembers.projectId))
      .where(and(
        eq(sites.id, siteId),
        eq(projectMembers.userId, userId)
      ))
      .limit(1);

    if (!siteData.length) {
      throw new ForbiddenException('Access denied to this site');
    }
  }

  private async verifyUserSpeciesAccess(userSpeciesId: string, userId: string): Promise<void> {
    const userSpeciesData = await this.drizzle.db
      .select({ id: userSpecies.id })
      .from(userSpecies)
      .where(and(
        eq(userSpecies.id, userSpeciesId),
        eq(userSpecies.userId, userId)
      ))
      .limit(1);

    if (!userSpeciesData.length) {
      throw new ForbiddenException('Access denied to this user species');
    }
  }

  private async getUserAccessibleSites(userId: string) {
    return this.drizzle.db
      .select({
        id: sites.id,
        name: sites.name,
        projectId: sites.projectId,
      })
      .from(sites)
      .leftJoin(projectMembers, eq(sites.projectId, projectMembers.projectId))
      .where(eq(projectMembers.userId, userId));
  }

  private formatTreeResponse(row: any): TreeResponseDto {
    const tree = row.trees;
    return {
      id: tree.id,
      siteId: tree.siteId,
      userSpeciesId: tree.userSpeciesId,
      identifier: tree.identifier,
      latitude: tree.latitude,
      longitude: tree.longitude,
      height: tree.height,
      diameter: tree.diameter,
      plantingDate: tree.plantingDate,
      status: tree.status,
      healthNotes: tree.healthNotes,
      images: tree.images || [],
      createdById: tree.createdById,
      createdAt: tree.createdAt,
      updatedAt: tree.updatedAt,
      metadata: tree.metadata,
      site: row.sites ? {
        id: row.sites.id,
        name: row.sites.name,
        projectId: row.sites.projectId,
      } : undefined,
      userSpecies: row.user_species && row.species ? {
        id: row.user_species.id,
        localName: row.user_species.localName,
        species: {
          id: row.species.id,
          scientificName: row.species.scientificName,
          commonName: row.species.commonName,
        },
      } : undefined,
      createdBy: row.users ? {
        id: row.users.id,
        name: row.users.name,
        email: row.users.email,
      } : undefined,
    };
  }

  private formatTreeRecordResponse(row: any): TreeRecordResponseDto {
    const record = row.tree_records;
    return {
      id: record.id,
      treeId: record.treeId,
      recordType: record.recordType,
      recordDate: record.recordDate,
      notes: record.notes,
      height: record.height,
      diameter: record.diameter,
      status: record.status,
      createdById: record.createdById,
      createdAt: record.createdAt,
      metadata: record.metadata,
      createdBy: row.users ? {
        id: row.users.id,
        name: row.users.name,
        email: row.users.email,
      } : undefined,
    };
  }
}