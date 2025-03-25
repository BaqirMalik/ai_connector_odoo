# -*- coding: utf-8 -*-

import requests
from odoo import fields, models, _


def notification_response(title, notification_type, message):
    """Method notification_response returns the notification data according
    to each conditions while checking the connection to ChatGPT."""
    notification_data = {
        'type': 'ir.actions.client',
        'tag': 'display_notification',
        'params': {
            'title': _(title),
            'type': notification_type,
            'message': message,
            'sticky': False,
        }
    }
    return notification_data


class ResConfigSettings(models.TransientModel):
    """This class extends the base 'res.config.settings' model to include
        additional fields for configuring ChatGPT integration settings."""
    _inherit = "res.config.settings"

    api_key = fields.Char(string="API Key", help="Provide the API key here",
                          config_parameter="odoo_chatgpt_connector.api_key")

    def action_test_api(self):
        """Tests the connection from Odoo to Gemini API."""
        api_key = self.env['ir.config_parameter'].sudo().get_param(
            'odoo_chatgpt_connector.api_key'
        )
        if not api_key:
            return notification_response(
                title="No API key!",
                notification_type="danger",
                message="Please provide an API Key"
            )

        # Correct Gemini API Endpoint
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={api_key}"

        # Correct Request Body for Gemini API
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": "Hello, how are you?"}]
                }
            ]
        }

        headers = {"Content-Type": "application/json"}

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            response.raise_for_status()  # Raise an error for HTTP failures

            # Extract response content (Gemini API returns structured responses)
            result = response.json()
            ai_response = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text",
                                                                                                         "No response")

            return notification_response(
                title="Connection Successful!",
                notification_type="success",
                message=f"Successfully connected to Gemini API: {ai_response}"
            )

        except requests.exceptions.Timeout:
            return notification_response(
                title="Connection Timeout!",
                notification_type="danger",
                message="The request to Gemini API timed out"
            )
        except requests.exceptions.RequestException as e:
            return notification_response(
                title="Connection Error!",
                notification_type="danger",
                message=f"Error connecting to Gemini API: {str(e)}"
            )