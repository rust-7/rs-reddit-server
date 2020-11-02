import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";
import { Resolver, Query, Arg, Mutation, InputType, Field, Ctx, UseMiddleware } from "type-graphql";
import { Post } from "../entities/Post";

@InputType()
class PostInput {
    @Field()
    title: string

    @Field()
    text: string
}

@Resolver()
export class PostResolver {
    @Query(() => [Post])
    async posts(): Promise<Post[]> {
        return Post.find();
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