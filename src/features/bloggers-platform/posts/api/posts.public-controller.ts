import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostViewModel } from './models/view/post.view-model';
import { GetPostQueryParams } from './models/input/create-post.input-model';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { PaginatedViewModel } from '../../../../core/models/base-paginated.view-model';
import {
  CreateCommentInputModel,
  GetCommentQueryParams,
} from '../../comments/api/models/input/create-comment.input-model';
import { CurrentUserId } from '../../../../core/decorators/param/current-user-id.param-decorator';
import { JwtAuthGuard } from '../../../../core/guards/jwt-auth.guard';
import { CommentViewModel } from '../../comments/api/models/view/comment.view.model';
import { LikeInputModel } from '../../likes/api/models/input/like.input-model';
import { IdentifyUser } from '../../../../core/decorators/param/identify-user.param-decorator';
import { JwtOptionalAuthGuard } from '../../guards/jwt-optional-auth.guard';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UpdateLikeStatusForPostCommand } from '../application/use-cases/update-like-status-for post.use-case';
import { CreateCommentCommand } from '../../comments/application/use-cases/create-comment.use-case';
import { GetPostByIdQuery } from '../application/queries/get-post-by-id.query';
import { GetPostsQuery } from '../application/queries/get-posts.query';
import { GetCommentByIdQuery } from '../../comments/application/queries/get-comment-by-id.query';
import { GetCommentsForSpecificPostQuery } from '../../comments/application/queries/get-comments-for-specified-post.query';
import { IdIsNumberValidationPipe } from '../../../../core/pipes/id-is-number.validation-pipe';
import { ApiNoContentConfiguredResponse } from '../../../../core/decorators/swagger/api-no-content-configured-response';
import { ApiBadRequestConfiguredResponse } from '../../../../core/decorators/swagger/api-bad-request-configured-response';
import { ApiUnauthorizedConfiguredResponse } from '../../../../core/decorators/swagger/api-unauthorized-configured-response';
import { ApiNotFoundConfiguredResponse } from '../../../../core/decorators/swagger/api-not-found-configured-response';
import { ApiOkConfiguredResponse } from '../../../../core/decorators/swagger/api-ok-configured-response';
import { ApiCreatedConfiguredResponse } from '../../../../core/decorators/swagger/api-created-configured-response';

@Controller('posts')
@ApiTags('Posts')
export class PostsPublicController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Put(':postId/like-status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiNoContentConfiguredResponse()
  @ApiBadRequestConfiguredResponse()
  @ApiUnauthorizedConfiguredResponse()
  @ApiNotFoundConfiguredResponse(`If post with specified postId is not exists`)
  @ApiParam({ name: 'postId', type: String, required: true })
  async updateLikeStatus(
    @CurrentUserId() currentUserId: string,
    @Param('postId', IdIsNumberValidationPipe) postId: number,
    @Body() likeInputModel: LikeInputModel,
  ) {
    await this.commandBus.execute(
      new UpdateLikeStatusForPostCommand(currentUserId, postId, likeInputModel),
    );
  }

  @Get(':postId/comments')
  @UseGuards(JwtOptionalAuthGuard)
  @ApiOkConfiguredResponse(CommentViewModel)
  @ApiNotFoundConfiguredResponse(`If post with specified postId is not exists`)
  @ApiParam({ name: 'postId', type: String, required: true })
  async getCommentsByPostId(
    @IdentifyUser() identifyUser: string,
    @Param('postId', IdIsNumberValidationPipe) postId: number,
    @Query() query: GetCommentQueryParams,
  ): Promise<PaginatedViewModel<CommentViewModel[]>> {
    return await this.queryBus.execute(
      new GetCommentsForSpecificPostQuery(identifyUser, postId, query),
    );
  }

  @Post(':postId/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedConfiguredResponse(
    CommentViewModel,
    'Returns the newly created comment',
  )
  @ApiBadRequestConfiguredResponse()
  @ApiUnauthorizedConfiguredResponse()
  @ApiNotFoundConfiguredResponse('If post with specified postId is not exists')
  @ApiParam({ name: 'postId', type: String, required: true })
  async createCommentByPostId(
    @CurrentUserId() currentUserId: string,
    @Param('postId', IdIsNumberValidationPipe) postId: number,
    @Body() commentCreateModel: CreateCommentInputModel,
  ) {
    const createdCommentId = await this.commandBus.execute(
      new CreateCommentCommand(currentUserId, postId, commentCreateModel),
    );
    return await this.queryBus.execute(
      new GetCommentByIdQuery(currentUserId, createdCommentId),
    );
  }

  @Get()
  @UseGuards(JwtOptionalAuthGuard)
  @ApiOkConfiguredResponse(PostViewModel)
  async getAll(
    @IdentifyUser() identifyUser: string,
    @Query() query: GetPostQueryParams,
  ): Promise<PaginatedViewModel<PostViewModel[]>> {
    return await this.queryBus.execute(new GetPostsQuery(identifyUser, query));
  }

  @Get(':id')
  @UseGuards(JwtOptionalAuthGuard)
  @ApiOkConfiguredResponse(PostViewModel, '', false)
  @ApiNotFoundConfiguredResponse()
  @ApiParam({ name: 'id', type: String, required: true })
  async getById(
    @IdentifyUser() identifyUser: string,
    @Param('id') id: number,
  ): Promise<PostViewModel> {
    return await this.queryBus.execute(new GetPostByIdQuery(identifyUser, id));
  }
}
