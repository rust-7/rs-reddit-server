import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";
import { Resolver, Query, Arg, Mutation, InputType, Field, Ctx, UseMiddleware, Int, FieldResolver, Root, ObjectType, Info } from "type-graphql";
import { Post } from "../entities/Post";
import { getConnection } from "typeorm";
import { RedisClient } from "redis";
import { readFile } from "fs";

@InputType()
class PostInput {
    @Field()
    title: string

    @Field()
    text: string
}

@ObjectType()
class PaginatedPosts {
    @Field(() => [Post])
    posts: Post[]

    @Field()
    hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
    @FieldResolver(() => String)
    textSnippet(@Root() root: Post){
        return root.text.slice(0, 50)
    }
    
    @Query(() => PaginatedPosts)
    async posts(
        @Arg("limit", () => Int) limit: number,
        @Arg("cursor", () => String, { nullable: true }) cursor: string | null
    ): Promise<PaginatedPosts> {
        const realLimit = Math.min(50, limit);
        const realLimitPlusOne = realLimit + 1;
        const replacements: any[] = [realLimitPlusOne];
        
        if (cursor) {
            replacements.push(new Date(parseInt(cursor)));
        }

        const posts = await getConnection().query(`
            SELECT p.*,
            json_build_object(
                'id', u.id,
                'username', u.username,
                'email', u.email,
                'createdAt', u."createdAt",
                'updatedAt', u."updatedAt"
            ) creator
            FROM post p
            INNER JOIN public.user u ON u.id = p."creatorId"
            ${ cursor ? `WHERE p."createdAt" < $2` : "" }
            ORDER BY p."createdAt" DESC
            LIMIT $1
        `, replacements);
        
        // const qb = getConnection()
        //     .getRepository(Post)
        //     .createQueryBuilder("p")
        //     .innerJoinAndSelect("p.creator","u",'u.id = p."creatorId"',)
        //     .orderBy('p."createdAt"', 'DESC')
        //     .take(realLimitPlusOne)

            // if (cursor) {
            //     qb.where('p."createdAt" < :cursor', { 
            //         cursor: new Date(parseInt(cursor))
            //     })
            // }

            

            // const posts = await qb.getMany()

            console.log("posts", posts);

            return { 
                posts: posts.slice(0, realLimit), 
                hasMore: posts.length === realLimitPlusOne 
            };
    }

    // Fetch Single Post
    @Query(() => Post, { nullable: true })
    post(@Arg('id') id: number): Promise<Post | undefined> {
        return Post.findOne(id);
    }

    // Create Post
    @Mutation(() => Post)
    @UseMiddleware(isAuth)
    async createPost(
        @Arg("input")input: PostInput,
        @Ctx() { req }: MyContext
    ): Promise<Post> {
        return Post.create({
            ...input,
            creatorId: req.session.userId
        }).save()
    }

    // Update Post
    @Mutation(() => Post, { nullable: true })
    async updatePost(
        @Arg('id') id: number,
        @Arg('title', () => String, { nullable: true }) title: string,
    ): Promise<Post | null> {
        const post = await Post.findOne(id);
        
        if (!post) {
            return null
        }
        if (typeof title !== 'undefined') {
            await Post.update({ id }, { title })
        }
        return post;
    }

    // Delete Post 
    @Mutation(() => Boolean)
    async deletePost(@Arg('id') id: number): Promise<boolean> {
        await Post.delete(id)
        return true;
    }
}