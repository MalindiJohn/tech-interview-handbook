import { z } from 'zod';
import * as trpc from '@trpc/server';

import { createProtectedRouter } from '../context';

export const offersCommentsRouter = createProtectedRouter()
    .query('getComments', {
        input: z.object({
            profileId: z.string()
        }),
        async resolve({ ctx, input }) {
            const result = await ctx.prisma.offersProfile.findFirst({
                include: {
                    discussion: {
                        include: {
                            replies: true,
                            replyingTo: true,
                            user: true
                        }
                    }
                },
                where: {
                    id: input.profileId
                }
            })

            if (result) {
                return result.discussion.filter((x) => x.replyingToId === null)
            }

            return result
        }
    })
    .mutation("create", {
        input: z.object({
            message: z.string(),
            profileId: z.string(),
            replyingToId: z.string().optional(),
            userId: z.string()
        }),
        async resolve({ ctx, input }) {
            await ctx.prisma.offersReply.create({
                data: {
                    message: input.message,
                    profile: {
                        connect: {
                            id: input.profileId
                        }
                    },
                    replyingTo: {
                        connect: {
                            id: input.replyingToId
                        }
                    },
                    user: {
                        connect: {
                            id: input.userId
                        }
                    }
                }
            })

            // Get replies
            return
        }
    })
    .mutation("update", {
        input: z.object({
            id: z.string(),
            message: z.string(),
            profileId: z.string(),
            // Have to pass in either userID or token for validation
            token: z.string().optional(),
            userId: z.string().optional(),
        }),
        async resolve({ ctx, input }) {
            const messageToUpdate = await ctx.prisma.offersReply.findFirst({
                where: {
                    id: input.id
                }
            })
            const profile = await ctx.prisma.offersProfile.findFirst({
                where: {
                id: input.profileId,
                },
            });

            const profileEditToken = profile?.editToken;

            // To validate user editing, OP or correct user
            // TODO: improve validation process
            if (profileEditToken === input.token || messageToUpdate?.userId === input.userId) {
                return await ctx.prisma.offersReply.update({
                    data: {
                        message: input.message
                    },
                    where: {
                        id: input.id
                    }
                })
            }

            throw new trpc.TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Wrong userId or token.'
            })
        }
    })
    .mutation("delete", {
        input: z.object({
            id: z.string(),
            profileId: z.string(),
            // Have to pass in either userID or token for validation
            token: z.string().optional(),
            userId: z.string().optional(),
        }),
        async resolve({ ctx, input }) {
            const messageToDelete = await ctx.prisma.offersReply.findFirst({
                where: {
                    id: input.id
                }
            })
            const profile = await ctx.prisma.offersProfile.findFirst({
                where: {
                    id: input.profileId,
                },
            });

            const profileEditToken = profile?.editToken;

            // To validate user editing, OP or correct user
            // TODO: improve validation process
            if (profileEditToken === input.token || messageToDelete?.userId === input.userId) {
                await ctx.prisma.offersReply.delete({
                    where: {
                        id: input.id
                    }
                })
            }

            throw new trpc.TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Wrong userId or token.'
            })
        }
    })