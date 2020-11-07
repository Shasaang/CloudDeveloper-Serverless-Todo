import * as AWS from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const XAWS = AWSXRay.captureAWS(AWS);

export default class TodosAccess{
    constructor(
        private readonly docClient: DocumentClient = new XAWS.DynamoDB.DocumentClient(),
        private readonly todosTable = process.env.TODOS_TABLE,
        private readonly userIdIndex = process.env.INDEX_NAME
    ){

    }

    async getTodos(userId){
        const result = await this.docClient.query({
            TableName: this.todosTable,
            IndexName: this.userIdIndex,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            }
        }).promise();
  
        return result.Items;
    }

    async createTodo(todoItem) {
        await this.docClient.put({
            TableName: this.todosTable,
            Item: todoItem
        }).promise();
    }


    async getTodoById(todoId, userId){
        const result = await this.docClient.get({
            TableName: this.todosTable,
            Key: {
                todoId,
                userId
            }
        }).promise();
  
        return result.Item;
    }

    async updateTodoById(todoId, userId, updatedTodo){
        await this.docClient.update({
            TableName: this.todosTable,
            Key: {
                todoId,
                userId
            },
            UpdateExpression: 'set #name = :n, #dueDate = :due, #done = :d',
            ExpressionAttributeValues: {
                ':n': updatedTodo.name,
                ':due': updatedTodo.dueDate,
                ':d': updatedTodo.done
            },
            ExpressionAttributeNames: {
                '#name': 'name',
                '#dueDate': 'dueDate',
                '#done': 'done'
            }
        }).promise();
    }
  
    async deleteTodoById(todoId, userId){
        await this.docClient.delete({
            TableName: this.todosTable,
            Key: {
                todoId,
                userId
            }
        }).promise();
    
}
}