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

module.exports = function (opts) {

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
                    members: "string[]"
                },
                needEntity: true,
                permissions: [C.ROLE_OWNER],
                async handler(ctx) {
                    const newMembers = _.uniq(
                        [].concat(ctx.locals.entity.members || [], ctx.params.members)
                    );

                    return this.updateEntity(
                        ctx,
                        {
                            ...ctx.params,
                            members: newMembers,
                            scope: false
                        },
                        { permissive: true }
                    );
                }
            },

            removeMembers: {
                description: "Remove members from the board",
                rest: "DELETE /:id/members",
                params: {
                    id: "string",
                    members: "string[]"
                },
                needEntity: true,
                permissions: [C.ROLE_OWNER],
                async handler(ctx) {
                    const newMembers = ctx.locals.entity.members.filter(
                        m => !ctx.params.members.includes(m)
                    );

                    return this.updateEntity(
                        ctx,
                        {
                            id: ctx.params.id,
                            members: newMembers,
                            scope: false
                        },
                        { permissive: true }
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
                permissions: [C.ROLE_OWNER],
                async handler(ctx) {
                    return this.updateEntity(
                        ctx,
                        {
                            id: ctx.params.id,
                            owner: ctx.params.owner,
                            members: _.uniq([ctx.params.owner, ...ctx.locals.entity.members]),
                            scope: false
                        },
                        { permissive: true }
                    );
                }
            },
        }

    };
};

module.exports.DSCOPE = ['membership']
module.exports.SCOPE = SCOPE
module.exports.FIELDS = FIELDS