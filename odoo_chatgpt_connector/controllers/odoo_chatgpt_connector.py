# -*- coding: utf-8 -*-
from odoo import http


class ChatgptConnector(http.Controller):
    @http.route(['/chatgpt_form'], type='http', auth="public", csrf=False,
                website=True)
    def question_submit(self):
        return http.request.render('odoo_chatgpt_connector.connector')
