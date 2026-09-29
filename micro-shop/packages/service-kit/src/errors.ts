import type { FastifyReply } from 'fastify';

/**
 * The one error shape every service answers with. `Code` is each service's own
 * list of machine-readable codes (e.g. 'empty_cart'); `message` is for people.
 * The kit itself uses 'bad_request', 'not_found' and 'internal'.
 */
export type ErrorBody<Code extends string = string> = {
  error: Code;
  message: string;
};

export function sendError<Code extends string>(
  reply: FastifyReply,
  status: number,
  error: Code,
  message: string,
) {
  const body: ErrorBody<Code> = { error, message };
  return reply.code(status).send(body);
}
