from odoo import models, fields, api


class AiChatHistory(models.Model):
    _name = 'ai.chat.history'
    _description = 'Chat API Request History'
    _order = 'create_date desc'


    user_id = fields.Many2one(
        'res.users',
        string='User',
        default=lambda self: self.env.user.id,
        required=True
    )
    request_text = fields.Text(
        string='Request',
        required=True
    )
    response_text = fields.Text(
        string='Response'
    )
