"use strict";


const FIELDS = {
    owner: {
        type: "string",
        readonly: true,
        required: true,
        populate: {
            action: "v1.accounts.resolve",
            params: {
                fields: ["id", "username", "fullName", "avatar"]
            }
        },
        onCreate: ({ ctx }) => ctx.meta.userID,
        //validate: "validateOwner"
    },
    members: {
        type: "array",
        items: { type: "string", empty: false },
        readonly: true,
        onCreate: ({ ctx }) => (ctx.meta.userID ? [ctx.meta.userID] : []),
        //validate: "validateMembers",
        populate: {
            action: "v1.accounts.resolve",
            params: {
                fields: ["id", "username", "fullName", "avatar"]
            }
        }
    },
    public: {
        type: "boolean",
        readonly: true,
        default: false
    },
}

const SCOPE = {
    // List only boards where the logged in user is a member.
    // If no logged in user, list only public boards.
    membership(query, ctx) {
        if (!ctx) return;

        if (ctx && ctx.meta.userID) {
            query.members = ctx.meta.userID;
        } else {
            query.public = true;
        }

        return query;
    },
}

module.exports = function (opts = { permissions: 'default' }) {

    return {

        settings: {
            fields: FIELDS,

            scopes: SCOPE,
            defaultScopes: ["membership"]
        },
        actions: {
            // call v1.boards.addMembers --#userID xar8OJo4PMS753GeyN62 --id ZjQ1GMmYretJmgKpqZ14 --members[] xar8OJo4PMS753GeyN62
            addMembers: {
                description: "Add members to the board",
                rest: "POST /:id/members",
                params: {
                    id: "string",
                    member: "string"
                },
                needEntity: true,
                permissions: [`${opts.permissions}.addMember`],
                async handler(ctx) {

                    if (ctx.locals.entity.owner !== ctx.meta.userID) {
                        throw new MoleculerClientError(
                            `Owner can remove or add members`,
                            403,
                            "ERR_NO_PERMISSION",
                            { owner: ctx.locals.entity.owner }
                        );
                    }

                    return this.updateEntity(
                        ctx,
                        {
                            id: ctx.params.id,
                            $addToSet: {
                                members: ctx.params.member
                            }
                        },
                        { permissive: true, raw: true }
                    );
                }
            },

            removeMembers: {
                description: "Remove members from the board",
                rest: "DELETE /:id/members",
                params: {
                    id: "string",
                    member: "string"
                },
                needEntity: true,
                permissions: [`${opts.permissions}.removeMembers`],
                async handler(ctx) {

                    if (ctx.locals.entity.owner == ctx.params.member) {
                        throw new MoleculerClientError(
                            `Owner can not be remove as member`,
                            403,
                            "ERR_NO_PERMISSION",
                            { owner: ctx.locals.entity.owner }
                        );
                    }

                    if (ctx.locals.entity.owner !== ctx.meta.userID) {
                        throw new MoleculerClientError(
                            `Owner can remove or add members`,
                            403,
                            "ERR_NO_PERMISSION",
                            { owner: ctx.locals.entity.owner }
                        );
                    }


                    return this.updateEntity(
                        ctx,
                        {
                            id: ctx.params.id,
                            $pull: {
                                members: ctx.params.member
                            }
                        },
                        { permissive: true, raw: true }
                    );
                }
            },

            transferOwnership: {
                description: "Transfer the ownership of the board",
                rest: "POST /:id/transfer-ownership",
                params: {
                    id: "string",
                    owner: "string"
                },
                needEntity: true,
                permissions: [`${opts.permissions}.transferOwnership`],
                async handler(ctx) {



                    if (ctx.locals.entity.owner !== ctx.meta.userID) {
                        throw new MoleculerClientError(
                            `Owner can only transfer ownership`,
                            403,
                            "ERR_NO_PERMISSION",
                            { owner: ctx.locals.entity.owner }
                        );
                    }

                    return this.updateEntity(
                        ctx,
                        {
                            id: ctx.params.id,
                            $addToSet: {
                                members: ctx.params.owner
                            },
                            $set: {
                                owner: ctx.params.owner
                            }
                        },
                        { permissive: true, raw: true }
                    );
                }
            },
        }

    };
};

module.exports.DSCOPE = ['membership']
module.exports.SCOPE = SCOPE
module.exports.FIELDS = FIELDS