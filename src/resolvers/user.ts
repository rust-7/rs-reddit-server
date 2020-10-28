import { MyContext } from "src/types";
import { Resolver, Mutation, InputType, Field, Arg, Ctx, ObjectType, Query } from "type-graphql";
import { User } from "../entities/User";
import argon2 from 'argon2'

@InputType()
class UsernamePasswordInput {
    @Field()
    username: string
    @Field()
    password: string
}

@ObjectType()
class FieldError {
    @Field()
    field: string;
    @Field()
    message: string;
}

@ObjectType()
class UserResponse {
    @Field(() => [FieldError], { nullable: true })
    errors?: FieldError[];
    @Field(() => User, { nullable: true })
    user?: User;
}

@Resolver()
export class UserResolver {
    
    // Connected User
    @Query(() => User, { nullable: true })
    async me(
        @Ctx() { req, em }: MyContext
    ) {
        console.log("SESSION :: " ,req.session);
        
        
        // Not logged in
        if (!req.session.userId) {
            return null
        }
        const user = await em.findOne(User, { id: req.session.userId });

        return user;
    }
    
    // --- Register Mutation ---
    @Mutation(() => UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
        if (options.username.length <= 2) {
            return {
                errors: [{
                    field: 'username',
                    message: 'Username must contain more than 2 caracters'
                }]
            }
        }

        if (options.password.length <= 2) {
            return {
                errors: [{
                    field: 'password',
                    message: 'Password must contain more than 2 caracters'
                }]
            }
        }

        const hashedPassword = await argon2.hash(options.password)
        const user = em.create(User, { username: options.username, password: hashedPassword });
        
        try {
            await em.persistAndFlush(user);    
        } catch (err) {
            
            if (err.code === '23505') {
                // User Duplicata...
                return {
                    errors: [{
                        field: 'username',
                        message: 'username is taken'
                    }]
                }
            }
        }

        // Session User ID : This will keep them logged in
        req.session.userId = user.id;
        
        return { user };
    }

    // --- Login Mutation ---
    @Mutation(() => UserResponse)
    async login(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {
        const user = await em.findOne(User, { username: options.username });

        if (!user) {
            return {
                    errors: [
                    {
                        field: 'username',
                        message: 'username does not exist'
                    },
                ],
            };
        }

        const valid = await argon2.verify(user.password, options.password)
        if (!valid) {
            return {
                errors: [
                    {
                        field: 'password',
                        message: 'Incorrect password'
                    },
                ],
            };
        }

        req.session.userId = user.id;

        return {user};
    }
}